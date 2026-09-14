import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { PostgresOrderStore } from "../../lib/order-store-postgres.ts";
import { processInventoryOutbox } from "../../lib/inventory/outbox-worker.ts";
import { processOrderNotifications } from "../../lib/inventory/notification-worker.ts";
import { processStripeEvent } from "../../lib/webhook-handlers.ts";
import { InventoryConflictError } from "../../lib/inventory/types.ts";

// Store-level proof against a real local Postgres: transaction boundaries,
// FOR UPDATE SKIP LOCKED claims, lease fencing, refund ordering. Run via
//   DATABASE_URL=$(node scripts/prepare-local-order-db.mjs --database awt_reconcile_test --fresh) \
//   node --conditions=react-server --test tests/cross-system/outbox-postgres.test.mjs
// Refuses anything but the loopback rehearsal database.

const target = new URL(process.env.DATABASE_URL ?? "postgres://invalid");
assert.equal(target.hostname, "127.0.0.1", "loopback only");
assert.match(target.pathname, /^\/awt_(reconcile_test|hardening_rehearsal)$/);
const sql = postgres(target.href, { max: 4 });
after(() => sql.end());
const store = new PostgresOrderStore();
const second = new PostgresOrderStore();

async function fixture({ missing = false, paymentIntentId = null } = {}) {
  await quarantine();
  const id = randomUUID();
  await store.createPendingOrder({
    reference: id, checkoutSessionId: id, paymentIntentId,
    amountTotalCents: 100, currency: "aud", customerEmail: "fixture@example.test", customerName: "Test fixture",
    customerPhone: "000", deliveryMethod: "pickup", deliveryAddress: "Fixture", notes: "", lines: [],
    inventoryReservationId: missing ? null : randomUUID(), inventoryCommitRequestId: missing ? null : randomUUID(),
    inventoryStatus: missing ? "pending" : "reserved", inventoryReleaseRequestId: randomUUID(),
  });
  return { checkoutSessionId: id, paymentIntentId: `pi_${id}`, stripeEventId: `evt_${id}`, stripeEventType: "checkout.session.completed" };
}
/** Tests share one database: park any work left over from earlier tests so generic claims only see this test's rows. */
async function quarantine() {
  await sql`update inventory_outbox set next_attempt_at = now() + interval '1 day' where state in ('pending', 'processing')`;
  await sql`update orders set notification_next_attempt_at = now() + interval '1 day' where notified_at is null`;
}
const outboxRow = (reference, operation = "commit") => sql`select * from inventory_outbox where order_reference = ${reference} and operation = ${operation}`.then((r) => r[0]);

test("payment, outbox row and audit commit or roll back together", async () => {
  const input = await fixture();
  await sql.unsafe("create function reject_test_audit() returns trigger language plpgsql as $$ begin raise exception 'fixture audit failure'; end $$; create trigger reject_test_audit before insert on order_inventory_audit for each row execute function reject_test_audit()");
  try {
    await assert.rejects(store.confirmPaymentAndEnqueue(input));
    assert.equal((await store.getByCheckoutSessionId(input.checkoutSessionId)).status, "pending");
    assert.equal(await outboxRow(input.checkoutSessionId), undefined);
    assert.equal((await sql`select * from stripe_events where event_id = ${input.stripeEventId}`).length, 0, "the idempotency gate rolls back too, so the redelivery is not ignored");
  } finally {
    await sql.unsafe("drop trigger reject_test_audit on order_inventory_audit; drop function reject_test_audit()");
  }
  const paid = await store.confirmPaymentAndEnqueue(input);
  assert.equal(paid.status, "paid");
  assert.equal(paid.inventoryStatus, "commit_pending");
  assert.equal(paid.paymentIntentId, input.paymentIntentId, "PaymentIntent assigned after session creation is persisted");
  assert.equal((await outboxRow(input.checkoutSessionId)).state, "pending");
});

test("duplicate and concurrent payment events for one order produce one outbox row and one audit entry", async () => {
  const input = await fixture();
  await Promise.all(Array.from({ length: 6 }, (_, i) => (i % 2 ? store : second).confirmPaymentAndEnqueue(input)));
  await store.confirmPaymentAndEnqueue({ ...input, stripeEventId: `${input.stripeEventId}_b`, stripeEventType: "checkout.session.async_payment_succeeded" });
  assert.equal((await sql`select count(*)::int as n from inventory_outbox where order_reference = ${input.checkoutSessionId}`)[0].n, 1);
  assert.equal((await sql`select count(*)::int as n from order_inventory_audit where order_reference = ${input.checkoutSessionId} and event_type = 'PAYMENT_CONFIRMED'`)[0].n, 2, "two distinct Stripe events, each audited once");
});

test("claims use SKIP LOCKED: two stores never hand the same row to two workers; an expired lease fences the stale owner", async () => {
  const input = await fixture();
  await store.confirmPaymentAndEnqueue(input);
  const [a, b] = await Promise.all([store.claimInventoryWork("worker-a", 60), second.claimInventoryWork("worker-b", 60)]);
  const claimed = [a, b].filter(Boolean);
  assert.equal(claimed.length, 1, "exactly one worker holds the lease");
  const owner = a ? "worker-a" : "worker-b";
  const other = a ? "worker-b" : "worker-a";

  await sql`update inventory_outbox set lease_expires_at = now() - interval '1 second' where order_reference = ${input.checkoutSessionId}`;
  const reclaimed = await second.claimInventoryWork(other, 60);
  assert.equal(reclaimed.operationId, claimed[0].operationId);
  assert.equal(reclaimed.attemptCount, 2);

  await store.completeInventoryWork(reclaimed.operationId, owner);
  assert.equal((await outboxRow(input.checkoutSessionId)).state, "processing", "the stale owner's completion is ignored");
  await store.retryInventoryWork(reclaimed.operationId, owner, "late", true);
  assert.equal((await outboxRow(input.checkoutSessionId)).state, "processing", "the stale owner's failure is ignored");

  await second.completeInventoryWork(reclaimed.operationId, other);
  const row = await outboxRow(input.checkoutSessionId);
  assert.equal(row.state, "completed");
  assert.equal(row.lease_owner, null);
  const order = await store.getByCheckoutSessionId(input.checkoutSessionId);
  assert.equal(order.inventoryStatus, "committed");
});

test("retry backoff grows per attempt and a conflict parks the order in manual_review", async () => {
  const input = await fixture();
  await store.confirmPaymentAndEnqueue(input);
  let attempts = 0;
  const commit = async () => { attempts += 1; throw new Error("503"); };
  await processInventoryOutbox({ store, commit });
  let row = await outboxRow(input.checkoutSessionId);
  assert.equal(row.state, "pending");
  assert.equal(row.attempt_count, 1);
  const firstDelay = (new Date(row.next_attempt_at) - new Date(row.updated_at)) / 1000;
  assert.ok(firstDelay >= 14 && firstDelay <= 16, `first retry ≈15s, got ${firstDelay}`);
  assert.equal((await store.getByCheckoutSessionId(input.checkoutSessionId)).inventoryStatus, "commit_pending");

  await processInventoryOutbox({ store, commit });
  assert.equal(attempts, 1, "not due yet");
  await sql`update inventory_outbox set next_attempt_at = now() where order_reference = ${input.checkoutSessionId}`;
  await processInventoryOutbox({ store, commit });
  row = await outboxRow(input.checkoutSessionId);
  assert.equal(row.attempt_count, 2);
  const secondDelay = (new Date(row.next_attempt_at) - new Date(row.updated_at)) / 1000;
  assert.ok(secondDelay >= 29 && secondDelay <= 31, `second retry ≈30s, got ${secondDelay}`);

  await sql`update inventory_outbox set next_attempt_at = now() where order_reference = ${input.checkoutSessionId}`;
  await processInventoryOutbox({ store, commit: async () => { throw new InventoryConflictError("hold gone"); } });
  row = await outboxRow(input.checkoutSessionId);
  assert.equal(row.state, "manual_review");
  assert.equal(row.last_error_code, "InventoryConflictError");
  assert.equal((await store.getByCheckoutSessionId(input.checkoutSessionId)).inventoryStatus, "manual_review");
  assert.equal(await store.claimInventoryWork("anyone"), null, "manual_review rows are never re-claimed");
});

test("notification: claimed only once inventory is committed or under review; lease + owner fencing; backoff on failure", async () => {
  const input = await fixture();
  await store.confirmPaymentAndEnqueue(input);
  assert.equal(await store.claimNotification("n1"), null, "commit_pending is not announced");
  const work = await store.claimInventoryWork("w");
  await store.completeInventoryWork(work.operationId, "w");

  const [c1, c2] = await Promise.all([store.claimNotification("n1"), second.claimNotification("n2")]);
  assert.equal([c1, c2].filter(Boolean).length, 1);
  const owner = c1 ? "n1" : "n2";
  await store.finishNotification(input.checkoutSessionId, owner === "n1" ? "n2" : "n1", true);
  assert.equal((await store.getByCheckoutSessionId(input.checkoutSessionId)).notifiedAt, null, "a non-owner cannot mark delivered");

  await store.finishNotification(input.checkoutSessionId, owner, false);
  const row = (await sql`select notify_claimed_at, notification_owner, notification_attempts, notification_next_attempt_at, updated_at from orders where checkout_session_id = ${input.checkoutSessionId}`)[0];
  assert.equal(row.notify_claimed_at, null);
  assert.equal(row.notification_owner, null);
  assert.equal(row.notification_attempts, 1);
  const delay = (new Date(row.notification_next_attempt_at) - new Date(row.updated_at)) / 1000;
  assert.ok(delay >= 14 && delay <= 16, `notification backoff ≈15s, got ${delay}`);
  assert.equal(await store.claimNotification("n3"), null, "not due yet");

  await sql`update orders set notification_next_attempt_at = now() where checkout_session_id = ${input.checkoutSessionId}`;
  const sent = [];
  assert.deepEqual(await processOrderNotifications(store, async (m) => { sent.push(m); return { delivered: true }; }), { delivered: 1, failed: 0 });
  assert.equal(sent[0].idempotencyKey, `paid-order/${input.checkoutSessionId}`);
  assert.ok((await store.getByCheckoutSessionId(input.checkoutSessionId)).notifiedAt);
  assert.equal(await store.claimNotification("n4"), null);
});

test("a manual_review order is announced with a review subject", async () => {
  const input = await fixture({ missing: true });
  const paid = await store.confirmPaymentAndEnqueue(input);
  assert.equal(paid.inventoryStatus, "manual_review");
  const sent = [];
  await processOrderNotifications(store, async (m) => { sent.push(m); return { delivered: true }; });
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /NEEDS REVIEW/);
});

test("refund receipt: a full refund that arrives before the payment event makes the late payment land as refunded", async () => {
  const input = await fixture();
  await store.recordRefund(input.paymentIntentId, `evt_r_${input.checkoutSessionId}`);
  const paid = await store.confirmPaymentAndEnqueue(input);
  assert.equal(paid.status, "refunded");
  assert.equal(await store.claimNotification("n"), null);
  // Idempotent receipt, one audit row per order.
  await store.recordRefund(input.paymentIntentId, `evt_r2_${input.checkoutSessionId}`);
  assert.equal((await sql`select count(*)::int as n from order_refund_receipts where payment_intent_id = ${input.paymentIntentId}`)[0].n, 1);
});

test("cancelPendingOrder: transactional cancel + release row; idempotent; never touches a paid order; superseded by payment", async () => {
  const input = await fixture();
  assert.equal(await store.cancelPendingOrder(input.checkoutSessionId, "cancelled"), true);
  assert.equal(await store.cancelPendingOrder(input.checkoutSessionId, "cancelled"), true);
  let order = await store.getByCheckoutSessionId(input.checkoutSessionId);
  assert.equal(order.status, "cancelled");
  assert.equal(order.inventoryStatus, "release_pending");
  assert.equal((await sql`select count(*)::int as n from inventory_outbox where order_reference = ${input.checkoutSessionId}`)[0].n, 1);

  // Late verified payment: money is authoritative, the release is cancelled, operator decides.
  const paid = await store.confirmPaymentAndEnqueue(input);
  assert.equal(paid.status, "paid");
  assert.equal(paid.inventoryStatus, "manual_review");
  assert.equal((await outboxRow(input.checkoutSessionId, "release")).state, "cancelled");
  assert.equal(await outboxRow(input.checkoutSessionId, "commit"), undefined);
  assert.equal(await store.cancelPendingOrder(input.checkoutSessionId, "cancelled"), false);
  assert.equal(await store.claimInventoryWork("w"), null, "a cancelled release is never executed");

  const fresh = await fixture();
  await store.confirmPaymentAndEnqueue(fresh);
  assert.equal(await store.cancelPendingOrder(fresh.checkoutSessionId, "failed"), false);
  assert.equal((await store.getByCheckoutSessionId(fresh.checkoutSessionId)).status, "paid");
});

test("end to end through the webhook against Postgres: paid → committed → notified, then expiry is a no-op", async () => {
  const input = await fixture();
  const committed = [];
  const released = [];
  const sent = [];
  const deps = {
    store,
    notify: async (m) => { sent.push(m); return { delivered: true }; },
    commitInventory: async (...args) => { committed.push(args); return { status: "committed" }; },
    releaseInventory: async (...args) => { released.push(args); return { status: "released" }; },
  };
  const session = { id: input.checkoutSessionId, payment_status: "paid", payment_intent: input.paymentIntentId };
  await processStripeEvent({ id: input.stripeEventId, type: "checkout.session.completed", data: { object: session } }, deps);
  await processStripeEvent({ id: input.stripeEventId, type: "checkout.session.completed", data: { object: session } }, deps);
  await processStripeEvent({ id: `${input.stripeEventId}_exp`, type: "checkout.session.expired", data: { object: { id: input.checkoutSessionId } } }, deps);
  const order = await store.getByCheckoutSessionId(input.checkoutSessionId);
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.ok(order.notifiedAt);
  assert.equal(committed.length, 1);
  assert.equal(released.length, 0);
  assert.equal(sent.length, 1);
});
