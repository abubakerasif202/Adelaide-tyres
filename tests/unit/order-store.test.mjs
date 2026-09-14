import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { retryDelaySeconds } from "../../lib/order-store.ts";

function order(sessionId, overrides = {}) {
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
    deliveryAddress: "4 Birralee Rd, Regency Park SA 5010",
    notes: "",
    lines: [],
    inventoryReservationId: `00000000-0000-4000-8000-0000000000${sessionId.length}1`,
    inventoryStatus: "reserved",
    inventoryCommitRequestId: `00000000-0000-4000-8000-0000000000${sessionId.length}2`,
    inventoryReleaseRequestId: `00000000-0000-4000-8000-0000000000${sessionId.length}3`,
    ...overrides,
  };
}

const confirmation = (sessionId, eventId = `evt_${sessionId}`) => ({
  checkoutSessionId: sessionId, paymentIntentId: `pi_${sessionId}`, stripeEventId: eventId, stripeEventType: "checkout.session.completed",
});

test("confirmPaymentAndEnqueue is idempotent per Stripe event and queues exactly one commit", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("race"));

  const results = await Promise.all(Array.from({ length: 20 }, () => store.confirmPaymentAndEnqueue(confirmation("race"))));
  assert.ok(results.every((r) => r.status === "paid"));
  assert.equal(store.outbox.size, 1);
  assert.equal(store.audit.filter((a) => a.eventType === "PAYMENT_CONFIRMED").length, 1);
});

test("confirmPaymentAndEnqueue throws for an unknown session so Stripe retries instead of losing a payment", async () => {
  const store = new MemoryOrderStore();
  await assert.rejects(store.confirmPaymentAndEnqueue(confirmation("nope")), /ORDER_NOT_PERSISTED/);
});

test("a paid order with a missing reservation is parked in manual_review with no outbox row", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s1", { inventoryReservationId: null, inventoryCommitRequestId: null, inventoryStatus: "pending" }));
  const paid = await store.confirmPaymentAndEnqueue(confirmation("s1"));
  assert.equal(paid.status, "paid");
  assert.equal(paid.inventoryStatus, "manual_review");
  assert.equal(store.outbox.size, 0);
});

test("createPendingOrder is idempotent for a repeated checkout session id", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s3"));
  await store.createPendingOrder({ ...order("s3"), reference: "AWT-DIFFERENT" });
  assert.equal((await store.getByCheckoutSessionId("s3")).reference, "AWT-TEST-s3");
});

test("cancelPendingOrder never moves a paid order backwards and never queues a release for it", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s4"));
  await store.confirmPaymentAndEnqueue(confirmation("s4"));
  assert.equal(await store.cancelPendingOrder("s4", "cancelled"), false);
  const final = await store.getByCheckoutSessionId("s4");
  assert.equal(final.status, "paid");
  assert.equal([...store.outbox.values()].filter((w) => w.operation === "release").length, 0);
});

test("cancelPendingOrder is idempotent and re-arms an incomplete release", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s5"));
  assert.equal(await store.cancelPendingOrder("s5", "failed"), true);
  assert.equal(await store.cancelPendingOrder("s5", "failed"), true, "duplicate terminal event while the release is outstanding");
  assert.equal(await store.cancelPendingOrder("s5", "cancelled"), false, "a different terminal status never overwrites the first");
  assert.equal((await store.getByCheckoutSessionId("s5")).status, "failed");
  assert.equal([...store.outbox.values()].filter((w) => w.operation === "release").length, 1);
});

test("recordRefund closes the order by PaymentIntent id and is idempotent; recordPartialRefund only audits", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s6"));
  await store.confirmPaymentAndEnqueue(confirmation("s6"));
  await store.recordPartialRefund("pi_s6", "evt_p", { amount: 10000, amountRefunded: 1000 });
  assert.equal((await store.getByCheckoutSessionId("s6")).status, "paid");
  await store.recordRefund("pi_s6", "evt_r1");
  await store.recordRefund("pi_s6", "evt_r2");
  assert.equal((await store.getByCheckoutSessionId("s6")).status, "refunded");
  assert.equal(store.audit.filter((a) => a.eventType === "REFUND_CONFIRMED").length, 1);
  assert.equal(store.audit.filter((a) => a.eventType === "PARTIAL_REFUND_RECORDED").length, 1);
});

test("notification claims are leased, fenced by owner and never issued for unconfirmed inventory", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s7"));
  await store.confirmPaymentAndEnqueue(confirmation("s7"));
  assert.equal(await store.claimNotification("w1"), null, "commit_pending orders are not announced");

  const work = await store.claimInventoryWork("inv");
  await store.completeInventoryWork(work.operationId, "inv");
  const claimed = await store.claimNotification("w1");
  assert.equal(claimed.reference, "AWT-TEST-s7");
  assert.equal(await store.claimNotification("w2"), null, "active lease blocks a second worker");

  await store.finishNotification("s7", "w2", true);
  assert.equal((await store.getByCheckoutSessionId("s7")).notifiedAt, null, "a non-owner cannot mark delivered");
  await store.finishNotification("s7", "w1", true);
  assert.ok((await store.getByCheckoutSessionId("s7")).notifiedAt);
  assert.equal(await store.claimNotification("w3"), null, "a notified order is never re-claimed");
});

test("retry backoff doubles from 15 seconds and caps at one hour", () => {
  assert.deepEqual([1, 2, 3, 4, 9, 20].map(retryDelaySeconds), [15, 30, 60, 120, 3600, 3600]);
});

test("releaseStaleClaims only clears notification leases far older than the lease window", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(order("s8", { inventoryStatus: "reserved" }));
  await store.confirmPaymentAndEnqueue(confirmation("s8"));
  const work = await store.claimInventoryWork("inv");
  await store.completeInventoryWork(work.operationId, "inv");
  assert.ok(await store.claimNotification("w1"));
  assert.equal(await store.releaseStaleClaims(10), 0);
  const base = Date.now() + 11 * 60_000;
  store.now = () => base;
  assert.equal(await store.releaseStaleClaims(10), 1);
});
