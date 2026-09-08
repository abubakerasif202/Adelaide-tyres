import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";

function order(sessionId) {
  return {
    reference: `AWT-TEST-${sessionId}`,
    checkoutSessionId: sessionId,
    paymentIntentId: `pi_${sessionId}`,
    amountTotalCents: 10000,
    currency: "aud",
    customerEmail: "test@example.invalid",
    customerName: "Test",
    customerPhone: "0400000000",
    deliveryMethod: "pickup",
    deliveryAddress: "6 Birralee Rd, Regency Park SA 5010",
    notes: "",
    lines: [],
  };
}

test("only one of many concurrent claimFulfilment calls succeeds", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("race"));

  const results = await Promise.all(Array.from({ length: 20 }, () => store.claimFulfilment("race")));
  const winners = results.filter(Boolean);
  assert.equal(winners.length, 1, "exactly one caller should win the claim");

  const final = await store.getByCheckoutSessionId("race");
  assert.equal(final.status, "paid");
});

test("claimFulfilment on an already-notified order returns null", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s1"));
  await store.claimFulfilment("s1");
  await store.markNotified("s1");

  const second = await store.claimFulfilment("s1");
  assert.equal(second, null);
});

test("releaseFulfilmentClaim is a no-op once notified (never re-opens a completed order)", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s2"));
  await store.claimFulfilment("s2");
  await store.markNotified("s2");

  await store.releaseFulfilmentClaim("s2");
  const final = await store.getByCheckoutSessionId("s2");
  assert.equal(final.status, "paid");
  assert.ok(final.notifiedAt);
});

test("createPendingOrder is idempotent for a repeated checkout session id", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s3"));
  await store.createPendingOrder({ ...order("s3"), reference: "AWT-DIFFERENT" });

  const final = await store.getByCheckoutSessionId("s3");
  assert.equal(final.reference, "AWT-TEST-s3", "the first insert wins; a duplicate create must not overwrite it");
});

test("transitionPendingTo never moves a paid order backwards", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s4"));
  await store.claimFulfilment("s4");
  await store.markNotified("s4");

  const moved = await store.transitionPendingTo("s4", "cancelled");
  assert.equal(moved, false);
  const final = await store.getByCheckoutSessionId("s4");
  assert.equal(final.status, "paid");
});

test("transitionPaidToRefunded only affects paid orders, looked up by PaymentIntent id", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s5"));

  const tooEarly = await store.transitionPaidToRefunded("pi_s5");
  assert.equal(tooEarly, false);

  await store.claimFulfilment("s5");
  await store.markNotified("s5");
  const refunded = await store.transitionPaidToRefunded("pi_s5");
  assert.equal(refunded, true);
  const final = await store.getByCheckoutSessionId("s5");
  assert.equal(final.status, "refunded");
});
