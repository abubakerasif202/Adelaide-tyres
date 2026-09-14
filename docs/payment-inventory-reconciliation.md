# Payment ↔ inventory fulfilment: reconciled design

Two commits forked from `494355b` and implemented competing designs for the
paid-order → inventory-commit path:

| | `53d7c74` (master, "Fix paid order inventory and refund races") | `476888a` (`fix/inventory-production-hardening`) |
|---|---|---|
| Payment persistence | `claimFulfilment` UPDATE sets `paid` + `notify_claimed_at` in one statement; PaymentIntent id coalesced in | `confirmPaymentAndEnqueue` transaction: `stripe_events` insert is the idempotency gate, order → `paid`, `inventory_outbox` row, audit row |
| Inventory commit | Inline in the webhook; failure → claim released, webhook 5xx, Stripe redelivers | Durable outbox row; worker with lease, attempt count, exponential backoff, `manual_review` after a stock conflict or 8 attempts |
| Notification | Inline after commit; failure → 5xx + redelivery; stale claims swept by `release-stale-claims` | Separate worker; `notify_claimed_at` + `notification_owner` lease (60 s), backoff, `finishNotification` fenced by owner + lease |
| Late expired/failed after paid | `transitionPendingTo` no-ops unless `pending`; release re-run when the order is already failed/cancelled (retry-safe) | `transitionPendingTo` only; a release that threw is never retried |
| Refunds | `charge.refunded` → paid → refunded, no distinction between partial/full | Full refund → `refunded` (+ receipt so a late payment event lands refunded); partial → audit only, order stays paid |
| 247 contract | `POST /sales/commit` only | Adds `POST /orders/state` before every commit — **that endpoint exists only on 247's unmerged `fix/inventory-production-hardening` (`0878468`), not on 247 `main`** |
| Schema | 001 + 002 | + 003: `inventory_outbox`, `order_inventory_audit`, `order_refund_receipts`, notification lease columns, wider `inventory_status` check, RLS |

## Why the 3 master tests failed

`tests/unit/webhook-inventory.test.mjs` on master:

1. *payment succeeded but the inventory commit failed* — asserted `status === "pending"`
   after a failed commit. That was the pre-`53d7c74` rollback semantic; it contradicts
   "payment must never be reverted because inventory/notification fails". Outdated
   expectation, replaced by: status stays `paid`, inventory `commit_pending`, no
   notification, outbox retry commits once under the same request id.
2. *payment failure and session expiry release the hold once* — real bug. Master
   re-ran the release on every duplicate terminal event (`transitioned || status ===
   "failed"`) with no inventory-state guard, so two duplicates produced four 247
   release calls. Root cause fixed: release is a durable outbox operation keyed
   `(order_reference, 'release')`; a completed release is never re-run, a failed
   one is retried by the worker.
3. *a paid order missing its reservation is never fulfilled silently* — asserted
   `status === "pending"` and a thrown error. Redelivery cannot fix a missing
   reservation, so throwing means Stripe retries for days. Replaced by: `paid` +
   `manual_review`, operator notified, webhook acknowledged.

## Chosen architecture

Durable local state first, external side effects second (the `476888a` shape),
with the `53d7c74` protections folded in and the untested 247 contract change
left out.

1. **Webhook** verifies the event, then `confirmPaymentAndEnqueue` in one
   transaction: `stripe_events` insert (duplicate → return current row, no
   changes), advisory lock on the PaymentIntent, order `paid`, PaymentIntent id
   coalesced (from `53d7c74`), `inventory_status` → `commit_pending` and an outbox
   `commit` row, or `manual_review` when there is nothing safe to commit. A prior
   full-refund receipt makes a late payment event land as `refunded` (from
   `476888a`). The webhook then runs one best-effort pass of the workers and
   always acknowledges with 2xx once the transaction committed — inventory and
   email outcomes can never make the Stripe state ambiguous.
2. **Inventory outbox worker** (`lib/inventory/outbox-worker.ts`) claims rows with
   `FOR UPDATE SKIP LOCKED`, a 60 s lease and an owner; completion/retry are
   fenced on `(operation_id, state='processing', lease_owner)`, so a stale worker
   cannot overwrite a newer claim. Backoff `15 s × 2^(attempt−1)` capped at 1 h.
   `InventoryConflictError` (hold expired/released) or 8 attempts → `manual_review`.
   `commitInventory` is unchanged from master: a single idempotent
   `POST /sales/commit` under the durable `inventory_commit_request_id`.
3. **Terminal events** (`async_payment_failed`, `expired`) call
   `cancelPendingOrder`: `pending` → `failed`/`cancelled`, `inventory_status` →
   `release_pending`, outbox `release` row. Duplicates and an already-cancelled
   order with an unreleased hold re-arm the same row (`ON CONFLICT DO NOTHING`), so
   a failed release is retried and a successful one is never repeated. A paid order
   is never touched.
4. **Notification worker** (`lib/inventory/notification-worker.ts`) claims orders
   that are `paid` and `committed` **or `manual_review`** (the latter with a
   "NEEDS REVIEW" subject so a blocked paid order is visible to a person, not just
   an audit row). Lease + owner fencing, backoff on failure, Resend idempotency key
   per order. A failed email never changes payment or inventory state.
5. **Cron** `GET /api/cron/inventory-outbox` every 5 minutes (`vercel.json`), bearer
   `CRON_SECRET`, fail-closed when unset, constant-time compare. It drains the
   outbox and notifications, so any work interrupted by a crash resumes.
6. **Refunds**: full → `recordRefund` (order `refunded`, receipt row, never restocks);
   partial → `recordPartialRefund` (audit only, order stays `paid`/fulfilable).

### Deliberately excluded from `476888a`

`registerPaidOrderState` / `POST /api/integrations/adelaide/orders/state`. 247
production (`main`) does not serve it; adopting it would 404 every commit into
`manual_review`. The local cross-system harness would still pass because local 247
runs the branch that has the endpoint. Re-introduce it only after 247 PR with
commit `0878468` is deployed, behind an explicit flag.

## State model

### `orders.status`

```
pending ──► paid ──► refunded
   │
   ├──► failed
   └──► cancelled
failed/cancelled ──► paid     (a verified Stripe payment is authoritative; inventory
                               goes to manual_review because the hold was released)
```
Never: `paid → pending`, `paid → failed/cancelled`, anything out of `refunded`.

### `orders.inventory_status`

```
pending ─────────────────────────────────► manual_review   (paid with no reservation)
reserved ──► commit_pending ──► committed
                 │
                 └──► manual_review          (conflict / 8 attempts / released hold)
reserved ──► release_pending ──► released
failed                                       (reservation never obtained at checkout)
```
Terminal: `committed`, `released`, `manual_review` (operator exit only), `failed`.
Never: `committed → released` (a return is a normal 247 stock-in), `released →
committed`.

### `inventory_outbox.state`

`pending → processing → completed | pending (retry) | manual_review`;
`pending/processing → cancelled` only for a `release` row superseded by a
verified payment.

## Concurrency and idempotency

- Stripe events: `stripe_events(event_id)` primary key inside the payment
  transaction; `pg_advisory_xact_lock(hashtext(payment_intent))` serialises
  concurrent deliveries for the same payment.
- Outbox rows: `(order_reference, operation)` unique; `request_id` unique; the 247
  request id is the durable `inventory_commit_request_id`/`inventory_release_request_id`
  minted at checkout, so retries and lost responses converge on one 247 side effect.
- Worker fencing: every completion/retry UPDATE requires `state='processing' and
  lease_owner=$worker`; a claim is only possible when `pending` or the lease expired.
- Notification: claim requires `notify_claimed_at is null or older than the lease`;
  `finishNotification` requires `notification_owner=$worker and notify_claimed_at`
  within the lease.
- Memory store mirrors every guard with check-then-mutate on the single-threaded
  event loop, so unit tests exercise the same invariants.

## Migration

`migrations/003_durable_inventory_outbox.sql` — forward-only, `IF NOT EXISTS`
throughout, widens the `inventory_status` check, adds the outbox/audit/receipt
tables and notification lease columns, then backfills: every `paid` order whose
inventory is not committed gets an outbox commit row (or `manual_review` when it
has no reservation). Existing rows keep their data.
