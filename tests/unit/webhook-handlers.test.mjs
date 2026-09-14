import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { processStripeEvent } from "../../lib/webhook-handlers.ts";
import { processInventoryOutbox } from "../../lib/inventory/outbox-worker.ts";
import { processOrderNotifications } from "../../lib/inventory/notification-worker.ts";

function makeOrderInput(sessionId, overrides = {}) {
  return {
    reference: `AWT-TEST-${sessionId}`,
    checkoutSessionId: sessionId,
    paymentIntentId: `pi_${sessionId}`,
    amountTotalCents: 45000,
    currency: "aud",
    customerEmail: "test@example.invalid",
    customerName: "Test business",
    customerPhone: "0400000000",
    deliveryMethod: "pickup",
    deliveryAddress: "4 Birralee Rd, Regency Park SA 5010",
    notes: "",
    lines: [{ id: "t1", brand: "Ralson", pattern: "RMR61", size: "295/80R22.5", quantity: 2, price: 450 }],
    inventoryReservationId: "00000000-0000-4000-8000-000000000001",
    inventoryStatus: "reserved",
    inventoryCommitRequestId: "00000000-0000-4000-8000-000000000002",
    inventoryReleaseRequestId: "00000000-0000-4000-8000-000000000003",
    ...overrides,
  };
}

function checkoutCompletedEvent(sessionId, { paymentStatus = "paid", eventId = `evt_${sessionId}_1` } = {}) {
  return {
    id: eventId,
    type: "checkout.session.completed",
    data: { object: { id: sessionId, payment_status: paymentStatus, payment_intent: `pi_${sessionId}` } },
  };
}

function makeNotify(impl) {
  const calls = [];
  const fn = async (message) => {
    calls.push(message);
    return impl ? impl(message) : { delivered: true };
  };
  fn.calls = calls;
  return fn;
}

function inventoryDeps() {
  const committed = [];
  const released = [];
  return {
    committed,
    released,
    commitInventory: async (...args) => { committed.push(args); return { status: "committed" }; },
    releaseInventory: async (...args) => { released.push(args); return { status: "released" }; },
  };
}

/** Moves the store's clock forward so leases and backoff windows elapse. */
const advance = (store, ms) => { const base = Date.now() + ms; store.now = () => base; };

test("successful payment: order transitions pending -> paid, commits stock and notifies exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_1"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(checkoutCompletedEvent("sess_1"), { store, notify, ...inventory });

  const order = await store.getByCheckoutSessionId("sess_1");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.ok(order.notifiedAt);
  assert.equal(inventory.committed.length, 1);
  assert.equal(notify.calls.length, 1);
  assert.match(notify.calls[0].subject, /^PAID order AWT-TEST-sess_1/);
  assert.equal(notify.calls[0].idempotencyKey, "paid-order/AWT-TEST-sess_1");
});

test("concurrent duplicate webhook delivery for the same session commits and notifies exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_2"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  const event = checkoutCompletedEvent("sess_2");

  await Promise.all(Array.from({ length: 10 }, () => processStripeEvent(event, { store, notify, ...inventory })));

  assert.equal(inventory.committed.length, 1);
  assert.equal(notify.calls.length, 1);
  assert.equal((await store.getByCheckoutSessionId("sess_2")).status, "paid");
});

test("out-of-order delivery: a second success event id for an already-paid order changes nothing", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_3"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(checkoutCompletedEvent("sess_3", { eventId: "evt_a" }), { store, notify, ...inventory });
  await processStripeEvent(checkoutCompletedEvent("sess_3", { eventId: "evt_b" }), { store, notify, ...inventory });
  await processStripeEvent({ ...checkoutCompletedEvent("sess_3", { eventId: "evt_c" }), type: "checkout.session.async_payment_succeeded" }, { store, notify, ...inventory });

  assert.equal(inventory.committed.length, 1);
  assert.equal(notify.calls.length, 1);
  assert.equal(store.outbox.size, 1, "one durable commit row per order");
});

test("failed notification never changes payment or inventory state; the retry delivers", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_4"));
  const inventory = inventoryDeps();
  let attempt = 0;
  const notify = makeNotify(() => ({ delivered: ++attempt > 1 }));

  await processStripeEvent(checkoutCompletedEvent("sess_4"), { store, notify, ...inventory });
  let order = await store.getByCheckoutSessionId("sess_4");
  assert.equal(order.status, "paid", "a failed email must never revert a payment");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(order.notifiedAt, null);
  assert.equal(inventory.committed.length, 1);

  // Before the backoff elapses the cron leaves it alone.
  await processOrderNotifications(store, notify);
  assert.equal(notify.calls.length, 1);

  advance(store, 120_000);
  await processOrderNotifications(store, notify);
  order = await store.getByCheckoutSessionId("sess_4");
  assert.ok(order.notifiedAt);
  assert.equal(notify.calls.length, 2);
  assert.equal(inventory.committed.length, 1, "retrying the email never re-commits stock");
});

test("checkout session expiry cancels a still-pending order and releases its hold, but never touches a paid one", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_5"));
  await store.createPendingOrder(makeOrderInput("sess_6"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  const expired = (id) => ({ id: `evt_exp_${id}`, type: "checkout.session.expired", data: { object: { id } } });

  await processStripeEvent(expired("sess_5"), { store, notify, ...inventory });
  const cancelled = await store.getByCheckoutSessionId("sess_5");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.inventoryStatus, "released");
  assert.equal(inventory.released.length, 1);

  await processStripeEvent(checkoutCompletedEvent("sess_6"), { store, notify, ...inventory });
  await processStripeEvent(expired("sess_6"), { store, notify, ...inventory });
  const paid = await store.getByCheckoutSessionId("sess_6");
  assert.equal(paid.status, "paid");
  assert.equal(paid.inventoryStatus, "committed");
  assert.equal(inventory.released.length, 1, "no release for the paid order");
  assert.equal(notify.calls.length, 1);
});

test("async payment failure marks a pending order failed and releases the hold", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_7"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent({ id: "evt_fail", type: "checkout.session.async_payment_failed", data: { object: { id: "sess_7" } } }, { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_7");
  assert.equal(order.status, "failed");
  assert.equal(order.inventoryStatus, "released");
  assert.equal(notify.calls.length, 0);
});

test("a full refund transitions a paid order to refunded and is idempotent", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_8"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent(checkoutCompletedEvent("sess_8"), { store, notify, ...inventory });
  const refund = (id) => ({ id, type: "charge.refunded", data: { object: { payment_intent: "pi_sess_8", refunded: true, amount: 45000, amount_refunded: 45000 } } });
  await processStripeEvent(refund("evt_r1"), { store, notify, ...inventory });
  await processStripeEvent(refund("evt_r2"), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_8");
  assert.equal(order.status, "refunded");
  assert.equal(order.inventoryStatus, "committed", "a refund never restocks by itself");
  assert.equal(store.audit.filter((a) => a.eventType === "REFUND_CONFIRMED").length, 1);
});

test("a paid session with no order row is surfaced as a retryable failure, never silently acknowledged", async () => {
  const store = new MemoryOrderStore();
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await assert.rejects(processStripeEvent(checkoutCompletedEvent("sess_unknown"), { store, notify, ...inventory }), /ORDER_NOT_PERSISTED/);
  assert.equal(notify.calls.length, 0);
  assert.equal(inventory.committed.length, 0);
});

test("payment_status other than paid on checkout.session.completed does not fulfil", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_9"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent(checkoutCompletedEvent("sess_9", { paymentStatus: "unpaid" }), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_9");
  assert.equal(order.status, "pending");
  assert.equal(order.inventoryStatus, "reserved");
  assert.equal(notify.calls.length, 0);
  assert.equal(inventory.committed.length, 0);
});

test("payment success persists a PaymentIntent assigned after Session creation", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("late_pi", { paymentIntentId: null }));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(checkoutCompletedEvent("late_pi"), { store, notify, ...inventory });
  assert.equal((await store.getByCheckoutSessionId("late_pi")).paymentIntentId, "pi_late_pi");

  await processStripeEvent(
    { id: "evt_late_refund", type: "charge.refunded", data: { object: { payment_intent: "pi_late_pi", refunded: true } } },
    { store, notify, ...inventory },
  );
  assert.equal((await store.getByCheckoutSessionId("late_pi")).status, "refunded");
});

test("terminal Stripe event retries an inventory release after a transient failure, and never after success", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("release_retry"));
  let attempts = 0;
  const releaseInventory = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("offline");
    return { status: "released" };
  };
  const deps = { store, notify: makeNotify(), releaseInventory, commitInventory: inventoryDeps().commitInventory };
  const event = { id: "evt_release_retry", type: "checkout.session.expired", data: { object: { id: "release_retry" } } };

  // The webhook is acknowledged; the release is durable work that retries.
  await processStripeEvent(event, deps);
  let order = await store.getByCheckoutSessionId("release_retry");
  assert.equal(order.status, "cancelled");
  assert.equal(order.inventoryStatus, "release_pending");
  assert.equal(attempts, 1);

  // Duplicate delivery before the backoff elapses: re-armed, not re-run yet.
  await processStripeEvent({ ...event, id: "evt_release_retry_dup" }, deps);
  assert.equal(attempts, 1);

  advance(store, 60_000);
  await processInventoryOutbox({ store, release: releaseInventory });
  order = await store.getByCheckoutSessionId("release_retry");
  assert.equal(order.inventoryStatus, "released");
  assert.equal(attempts, 2);

  await processStripeEvent({ ...event, id: "evt_release_retry_late" }, deps);
  assert.equal(attempts, 2, "a completed release is never repeated");
});

test("a store failure during the inline fast path is deferred to cron, never turned into a Stripe retry", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_blip"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  const original = store.claimInventoryWork.bind(store);
  store.claimInventoryWork = async () => { throw new Error("connection reset"); };
  await processStripeEvent(checkoutCompletedEvent("sess_blip"), { store, notify, ...inventory });
  let order = await store.getByCheckoutSessionId("sess_blip");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "commit_pending");
  store.claimInventoryWork = original;
  await processInventoryOutbox({ store, commit: inventory.commitInventory });
  order = await store.getByCheckoutSessionId("sess_blip");
  assert.equal(order.inventoryStatus, "committed");
});
