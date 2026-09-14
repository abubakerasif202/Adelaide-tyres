import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { processOrderNotifications } from "../../lib/inventory/notification-worker.ts";
import { processStripeEvent } from "../../lib/webhook-handlers.ts";

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

test("successful payment: order transitions pending -> paid and notifies exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_1"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(checkoutCompletedEvent("sess_1"), { store, notify, ...inventory });

  const order = await store.getByCheckoutSessionId("sess_1");
  assert.equal(order.status, "paid");
  assert.ok(order.notifiedAt);
  assert.equal(notify.calls.length, 1);
  assert.equal(inventory.committed.length, 1);
  assert.match(notify.calls[0].subject, /PAID order AWT-TEST-sess_1/);
});

test("concurrent duplicate webhook delivery for the same session notifies exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_2"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await Promise.all([
    processStripeEvent(checkoutCompletedEvent("sess_2", { eventId: "evt_a" }), { store, notify, ...inventory }),
    processStripeEvent(checkoutCompletedEvent("sess_2", { eventId: "evt_b" }), { store, notify, ...inventory }),
  ]);

  assert.equal(notify.calls.length, 1);
  const order = await store.getByCheckoutSessionId("sess_2");
  assert.equal(order.status, "paid");
  assert.equal(inventory.committed.length, 1);
});

test("out-of-order delivery: a second success event for an already-paid order is a no-op", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_3"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(checkoutCompletedEvent("sess_3", { eventId: "evt_1" }), { store, notify, ...inventory });
  // A late-arriving async_payment_succeeded for the same session, after
  // checkout.session.completed already fulfilled it.
  await processStripeEvent(
    { id: "evt_2", type: "checkout.session.async_payment_succeeded", data: { object: { id: "sess_3", payment_status: "paid", payment_intent: "pi_sess_3" } } },
    { store, notify, ...inventory },
  );

  assert.equal(notify.calls.length, 1);
});

test("failed notification releases the claim so a retry can succeed", async () => {
  let now = Date.now();
  const store = new MemoryOrderStore(() => now);
  await store.createPendingOrder(makeOrderInput("sess_4"));
  let attempt = 0;
  const notify = makeNotify(() => {
    attempt += 1;
    if (attempt === 1) return { delivered: false };
    return { delivered: true };
  });
  const inventory = inventoryDeps();

  await processStripeEvent(checkoutCompletedEvent("sess_4", { eventId: "evt_1" }), { store, notify, ...inventory });
  let order = await store.getByCheckoutSessionId("sess_4");
  assert.equal(order.status, "paid", "notification failure never rewinds payment");
  assert.equal(order.notifiedAt, null);

  // The scheduled worker recovers without any additional payment webhook.
  now += 60_000;
  await processOrderNotifications(store, notify);
  order = await store.getByCheckoutSessionId("sess_4");
  assert.equal(order.status, "paid");
  assert.ok(order.notifiedAt);
  assert.equal(notify.calls.length, 2);
});

test("checkout session expiry cancels a still-pending order but never a paid one", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_5"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(
    { id: "evt_1", type: "checkout.session.expired", data: { object: { id: "sess_5" } } },
    { store, notify, ...inventory },
  );
  let order = await store.getByCheckoutSessionId("sess_5");
  assert.equal(order.status, "cancelled");

  // A paid order must never be knocked back to cancelled by a stale/duplicate
  // expiry event (out-of-order delivery).
  await store.createPendingOrder(makeOrderInput("sess_6"));
  await processStripeEvent(checkoutCompletedEvent("sess_6"), { store, notify, ...inventory });
  await processStripeEvent(
    { id: "evt_2", type: "checkout.session.expired", data: { object: { id: "sess_6" } } },
    { store, notify, ...inventory },
  );
  order = await store.getByCheckoutSessionId("sess_6");
  assert.equal(order.status, "paid");
});

test("async payment failure marks a pending order failed", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_7"));
  const notify = makeNotify();
  const inventory = inventoryDeps();

  await processStripeEvent(
    { id: "evt_1", type: "checkout.session.async_payment_failed", data: { object: { id: "sess_7" } } },
    { store, notify, ...inventory },
  );
  const order = await store.getByCheckoutSessionId("sess_7");
  assert.equal(order.status, "failed");
  assert.equal(notify.calls.length, 0);
});

test("a refund transitions a paid order to refunded", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_8"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent(checkoutCompletedEvent("sess_8"), { store, notify, ...inventory });

  await processStripeEvent(
    { id: "evt_refund", type: "charge.refunded", data: { object: { payment_intent: "pi_sess_8" } } },
    { store, notify, ...inventory },
  );

  const order = await store.getByCheckoutSessionId("sess_8");
  assert.equal(order.status, "refunded");
});

test("a partial refund keeps the order paid and fulfilable; only a full refund transitions it", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_8p"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent(checkoutCompletedEvent("sess_8p"), { store, notify, ...inventory });
  assert.equal(notify.calls.length, 1);

  // Stripe emits charge.refunded for partial refunds too; `refunded` stays false.
  const partial = (id) => ({ id, type: "charge.refunded", data: { object: { payment_intent: "pi_sess_8p", refunded: false, amount: 45000, amount_refunded: 5000 } } });
  await processStripeEvent(partial("evt_refund_partial"), { store, notify, ...inventory });
  let order = await store.getByCheckoutSessionId("sess_8p");
  assert.equal(order.status, "paid", "a partial refund (e.g. delivery fee) is not a cancelled sale");
  assert.equal(order.inventoryStatus, "committed");
  assert.deepEqual(store.audit.filter((a) => a.eventType === "PARTIAL_REFUND_RECORDED"), [
    { orderReference: order.reference, eventType: "PARTIAL_REFUND_RECORDED", stripeEventId: "evt_refund_partial", details: { amount: 45000, amountRefunded: 5000 } },
  ], "a partial refund leaves a durable audit record");

  const full = { id: "evt_refund_full", type: "charge.refunded", data: { object: { payment_intent: "pi_sess_8p", refunded: true, amount: 45000, amount_refunded: 45000 } } };
  await processStripeEvent(full, { store, notify, ...inventory });
  order = await store.getByCheckoutSessionId("sess_8p");
  assert.equal(order.status, "refunded");
  assert.equal(order.inventoryStatus, "committed", "a refund never restocks automatically");
  assert.equal(inventory.released.length, 0);
  assert.deepEqual(store.audit.map((a) => a.eventType), ["PARTIAL_REFUND_RECORDED", "REFUND_CONFIRMED"]);
});

test("a partial refund delivered before the paid event does not poison the order as refunded", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_8q"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent({ id: "evt_early_partial", type: "charge.refunded", data: { object: { payment_intent: "pi_sess_8q", refunded: false, amount: 45000, amount_refunded: 100 } } }, { store, notify, ...inventory });
  await processStripeEvent(checkoutCompletedEvent("sess_8q"), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_8q");
  assert.equal(order.status, "paid");
  assert.equal(notify.calls.length, 1, "staff are still told about the paid order");
});

test("a paid session arriving before its order is persisted requests redelivery", async () => {
  const store = new MemoryOrderStore();
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await assert.rejects(processStripeEvent(checkoutCompletedEvent("sess_unknown"), { store, notify, ...inventory }), /ORDER_NOT_PERSISTED/);
  assert.equal(notify.calls.length, 0);
});

test("payment_status other than paid on checkout.session.completed does not fulfil", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_9"));
  const notify = makeNotify();
  const inventory = inventoryDeps();
  await processStripeEvent(checkoutCompletedEvent("sess_9", { paymentStatus: "unpaid" }), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_9");
  assert.equal(order.status, "pending");
  assert.equal(notify.calls.length, 0);
});
