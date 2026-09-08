import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
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
    deliveryAddress: "6 Birralee Rd, Regency Park SA 5010",
    notes: "",
    lines: [{ id: "t1", brand: "Ralson", pattern: "RMR61", size: "295/80R22.5", quantity: 2, price: 450 }],
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

test("successful payment: order transitions pending -> paid and notifies exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_1"));
  const notify = makeNotify();

  await processStripeEvent(checkoutCompletedEvent("sess_1"), { store, notify });

  const order = await store.getByCheckoutSessionId("sess_1");
  assert.equal(order.status, "paid");
  assert.ok(order.notifiedAt);
  assert.equal(notify.calls.length, 1);
  assert.match(notify.calls[0].subject, /PAID order AWT-TEST-sess_1/);
});

test("concurrent duplicate webhook delivery for the same session notifies exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_2"));
  const notify = makeNotify();

  await Promise.all([
    processStripeEvent(checkoutCompletedEvent("sess_2", { eventId: "evt_a" }), { store, notify }),
    processStripeEvent(checkoutCompletedEvent("sess_2", { eventId: "evt_b" }), { store, notify }),
  ]);

  assert.equal(notify.calls.length, 1);
  const order = await store.getByCheckoutSessionId("sess_2");
  assert.equal(order.status, "paid");
});

test("out-of-order delivery: a second success event for an already-paid order is a no-op", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_3"));
  const notify = makeNotify();

  await processStripeEvent(checkoutCompletedEvent("sess_3", { eventId: "evt_1" }), { store, notify });
  // A late-arriving async_payment_succeeded for the same session, after
  // checkout.session.completed already fulfilled it.
  await processStripeEvent(
    { id: "evt_2", type: "checkout.session.async_payment_succeeded", data: { object: { id: "sess_3", payment_status: "paid", payment_intent: "pi_sess_3" } } },
    { store, notify },
  );

  assert.equal(notify.calls.length, 1);
});

test("failed notification releases the claim so a retry can succeed", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_4"));
  let attempt = 0;
  const notify = makeNotify(() => {
    attempt += 1;
    if (attempt === 1) return { delivered: false };
    return { delivered: true };
  });

  await assert.rejects(processStripeEvent(checkoutCompletedEvent("sess_4", { eventId: "evt_1" }), { store, notify }));
  let order = await store.getByCheckoutSessionId("sess_4");
  assert.equal(order.status, "pending", "claim must be released, not left stuck as paid-but-unnotified");
  assert.equal(order.notifiedAt, null);

  // Stripe redelivers the same event (or a related one) after the 500.
  await processStripeEvent(checkoutCompletedEvent("sess_4", { eventId: "evt_1_retry" }), { store, notify });
  order = await store.getByCheckoutSessionId("sess_4");
  assert.equal(order.status, "paid");
  assert.ok(order.notifiedAt);
  assert.equal(notify.calls.length, 2);
});

test("checkout session expiry cancels a still-pending order but never a paid one", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_5"));
  const notify = makeNotify();

  await processStripeEvent(
    { id: "evt_1", type: "checkout.session.expired", data: { object: { id: "sess_5" } } },
    { store, notify },
  );
  let order = await store.getByCheckoutSessionId("sess_5");
  assert.equal(order.status, "cancelled");

  // A paid order must never be knocked back to cancelled by a stale/duplicate
  // expiry event (out-of-order delivery).
  await store.createPendingOrder(makeOrderInput("sess_6"));
  await processStripeEvent(checkoutCompletedEvent("sess_6"), { store, notify });
  await processStripeEvent(
    { id: "evt_2", type: "checkout.session.expired", data: { object: { id: "sess_6" } } },
    { store, notify },
  );
  order = await store.getByCheckoutSessionId("sess_6");
  assert.equal(order.status, "paid");
});

test("async payment failure marks a pending order failed", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_7"));
  const notify = makeNotify();

  await processStripeEvent(
    { id: "evt_1", type: "checkout.session.async_payment_failed", data: { object: { id: "sess_7" } } },
    { store, notify },
  );
  const order = await store.getByCheckoutSessionId("sess_7");
  assert.equal(order.status, "failed");
  assert.equal(notify.calls.length, 0);
});

test("a refund transitions a paid order to refunded", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_8"));
  const notify = makeNotify();
  await processStripeEvent(checkoutCompletedEvent("sess_8"), { store, notify });

  await processStripeEvent(
    { id: "evt_refund", type: "charge.refunded", data: { object: { payment_intent: "pi_sess_8" } } },
    { store, notify },
  );

  const order = await store.getByCheckoutSessionId("sess_8");
  assert.equal(order.status, "refunded");
});

test("an unrecognised session id (no pending order) is a safe no-op, not a crash", async () => {
  const store = new MemoryOrderStore();
  const notify = makeNotify();
  await processStripeEvent(checkoutCompletedEvent("sess_unknown"), { store, notify });
  assert.equal(notify.calls.length, 0);
});

test("payment_status other than paid on checkout.session.completed does not fulfil", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_9"));
  const notify = makeNotify();
  await processStripeEvent(checkoutCompletedEvent("sess_9", { paymentStatus: "unpaid" }), { store, notify });
  const order = await store.getByCheckoutSessionId("sess_9");
  assert.equal(order.status, "pending");
  assert.equal(notify.calls.length, 0);
});
