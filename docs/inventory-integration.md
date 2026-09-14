# Adelaide Wholesale Tyres and 247 inventory integration

```mermaid
flowchart LR
  Customer --> AWT[Adelaide Wholesale Tyres server]
  AWT -->|HMAC signed HTTPS| API[247 Adelaide integration API]
  API -->|service role RPC only| DB[(247 inventory ledger)]
  AWT --> Stripe[Stripe Checkout]
  Stripe -->|verified webhook| AWT
  AWT -->|commit reservation| API
```

247 is the only stock authority. Adelaide retains catalogue content and public prices only. Catalogue availability is a batched, short-lived read through Adelaide's server route. Checkout never trusts it: it makes a live, atomic 247 reservation.

## Authentication and configuration

Adelaide server-only variables:

```text
INVENTORY_API_URL=https://inventory.example.com
INVENTORY_CLIENT_ID=adelaide-wholesale-tyres
INVENTORY_CLIENT_SECRET=replace-with-long-random-secret
INVENTORY_LOCATION_ID=247-regency-park-location-uuid
```

247 server-only variables:

```text
AWT_INVENTORY_CLIENT_ID=adelaide-wholesale-tyres
AWT_INVENTORY_CLIENT_SECRET=the-same-long-random-secret
AWT_INVENTORY_LOCATION_ID=247-regency-park-location-uuid
CRON_SECRET=separate-long-random-secret
```

Every Adelaide request signs `METHOD`, path, Unix timestamp, UUID request ID, and SHA-256 body hash. 247 verifies HMAC in constant time, validates a five-minute timestamp window, validates strict Zod input, and reaches its RPCs only with the service role. No browser receives an integration secret or Supabase service-role credential.

## Lifecycle and recovery

1. Adelaide creates one UUID checkout-attempt ID and derives a stable order reference.
2. 247 atomically locks all mapped Regency Park balances, checks `available = on_hand - reserved`, and creates a 45-minute hold (`INVENTORY_HOLD_MINUTES`). The Stripe Checkout Session is created with a 30-minute `expires_at` (`STRIPE_SESSION_TTL_MINUTES`), so a late payment can never land on an already-released hold.
3. Adelaide persists the reservation ID and commit/release request IDs with the durable order.
4. A verified paid Stripe webhook, in one transaction, records the event, marks the order `paid`, sets `inventory_status=commit_pending` and inserts a durable `inventory_outbox` commit row keyed by the order's commit request ID (`confirmPaymentAndEnqueue`). Only then is the webhook acknowledged. The webhook also makes one best-effort pass at the outbox and the notification queue; `/api/cron/inventory-outbox` (every five minutes, `CRON_SECRET`) owns delivery if the process dies.
5. The outbox worker claims a row under a 60-second lease (`for update skip locked`; an expired lease can be reclaimed and a stale owner can no longer complete it). For a commit it first sends the paid-state handoff `POST /orders/state` (stable request ID derived from the commit request ID, carrying the commit request ID) — this is what makes the hold unexpirable and unreleasable in 247 — and then `POST /sales/commit` under the identity 247 returned. 247 records the `stock_out` movement with `source_type=adelaide_wholesale_tyres`, integration actor data and the order reference. Transient failures back off exponentially (15 s … 1 h, `next_attempt_at`); a stock conflict (hold released/expired before it could be protected) or the eighth failure parks the row and the order in `manual_review`, which is visible in `orders.inventory_status` and `order_inventory_audit`.
6. Staff are notified only once the order is `paid` **and** `committed`, through a separately leased notification claim with a Resend idempotency key; a failed email never changes payment state.
7. Failed/expired payment releases the hold. A **full** refund (`charge.refunded=true`) marks the order `refunded` and stops any pending notification/fulfilment; a **partial** refund leaves a paid, fulfilable order. Neither restocks: physical returns use the normal 247 return workflow.

Reservation and commit request IDs are idempotent. The reservation identity is the canonical hash of `orderReference` plus the sorted `(mapping, quantity)` lines — the hold expiry is a retry parameter, not identity — so a retry of the same checkout attempt after a lost response converges on the same hold. Reusing a request ID with a different payload is rejected (`IDEMPOTENCY_KEY_REUSED`). Commit identity is the durable commit request ID stored with the Adelaide order. A commit validates the order reference while holding the reservation row, before posting any movement. Expired holds are released by the protected 247 cron endpoint and opportunistically by inventory calls.

## Failure states

| Situation | Adelaide state | 247 state | Recovery |
| --- | --- | --- | --- |
| 247 unreachable at checkout | 503 "We're confirming tyre availability…", no order | none | customer retries |
| Hold made, Adelaide never got the response | 503, no order | active hold | same checkout attempt retries → same hold; otherwise the hold expires |
| Hold made, Stripe session creation (or order persistence) failed | 502, no order | released (signed DELETE) | customer retries |
| Paid, 247 down at commit | order `paid`, `inventory_status=commit_pending`, outbox row pending, webhook 200 | active hold; paid-protected once the handoff lands | outbox retries with backoff (cron), same identities |
| Commit done, Adelaide never got the response | as above | committed | next outbox attempt replays handoff + commit → `committed`, no second deduction |
| Paid, hold already released/expired before the handoff | order `paid`, `inventory_status=manual_review` | released | operator reacquires stock in 247 (`admin_recover_adelaide_paid_order` / Retry commit) or refunds |
| Paid order with no reservation recorded | order `paid`, `inventory_status=manual_review`, no outbox row | — | manual investigation |
| Payment failed / session expired | order `failed`/`cancelled`, `released` | released | — |
| Full refund | order `refunded`, inventory stays `committed`, not notifiable | committed | a physical return is a normal 247 stock-in |
| Partial refund | order stays `paid`/fulfilable; audit only | committed | — |

The 247 auth middleware (`proxy.ts`) excludes `/api/integrations/`; those routes are protected solely by the HMAC boundary and are never redirected to `/login`. Reference (invoice/EFT) orders hold stock for the same window and then expire; the business confirms them manually.

## Mapping and rollout

The additive 247 migration seeds only exact normalized brand/pattern/size matches, once. Runtime processing uses only the permanent mapping UUID and its 247 product foreign key; it never fuzzy matches text. The explicitly unmapped `Greforce / G-PILOT X1 / 295/80R22.5` cannot be purchased online and displays a contact state.

Deploy in this order: apply the 247 migration; deploy 247 API and configure its secret/location; verify signed availability; configure Adelaide variables; deploy Adelaide; run a controlled reservation/payment/commit test; monitor reconciliation. Keep Adelaide integration disabled or checkout unavailable if 247 is unhealthy.

Rollback: disable Adelaide checkout/integration variables or route traffic before reverting application code. Do not delete or reverse 247 ledger movements. Existing holds may be safely released by the authenticated expiry endpoint or allowed to expire.

## Reconciliation

Run `supabase/reconciliation/adelaide-inventory.sql` in the 247 database with a service-role/admin connection. On the Adelaide side, `node --conditions=react-server scripts/inventory-reconcile.mjs` checks the static mapping (24 / 1 / 0) and, with `DATABASE_URL` (order store) and `INVENTORY_DATABASE_URL` (247 Postgres) set, cross-checks every order that holds stock against its 247 reservation and sale movement. `mapping_not_seeded_in_247` must come back empty in production before online checkout is enabled. It only reports discrepancies: unmapped/duplicate mappings, expired active holds, invalid balance state, and Adelaide movements lacking their reservation/order reference. Investigate before any manual correction; use normal 247 ledger adjustments, never direct balance updates.

## Local cross-system verification

`node scripts/prepare-local-order-db.mjs` creates the disposable `awt_hardening_rehearsal` order database on the local Supabase Postgres (loopback only) and applies `migrations/*.sql`; it prints the `DATABASE_URL` for `tests/cross-system/outbox-postgres.test.mjs` (atomic payment/outbox/audit, leases, stale-owner fencing, backoff, out-of-order refunds, notification recovery). `tests/cross-system/order-store-upgrade.test.mjs` builds a second database at the previously deployed schema (001 + 002), writes representative orders under it, applies 003 and proves the backfill, RLS and the upgraded store end to end.

`npm run test:cross-system:local` (`scripts/run-cross-system-local.sh`; both repos built, local 247 Supabase running) prepares the disposable order database, starts both apps with every secret overridden to local/fake values, runs the HTTP proof and then the store-level suites, and stops the servers. `npm run test:cross-system` (tests/cross-system) drives a local `next start` of this site against a local 247 (`next start -p 3101`) through a fault-injecting loopback proxy, with a loopback Stripe stand-in and the local disposable Supabase. It proves the full path — availability, reservation, signed-webhook commit, duplicate and replayed commits, internal 247 stock-outs, concurrent oversell, outage fail-closed, lost-response retries, refund-no-restock and the unmapped product — without any network egress. The loopback-only overrides it relies on (`INVENTORY_ALLOW_INSECURE_LOOPBACK`, `STRIPE_API_BASE`, `NOTIFY_API_BASE`) are ignored for any non-loopback host. Browser tests (`npm run test:e2e`) declare availability through `tests/e2e/support/availability.ts` because the Playwright server has no 247 connection.
