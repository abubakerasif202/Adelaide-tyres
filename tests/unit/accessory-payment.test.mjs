import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { processStripeEvent } from "../../lib/webhook-handlers.ts";

const paidEvent = (sessionId) => ({
  id: `evt_${sessionId}`,
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      payment_status: "paid",
      payment_intent: `pi_${sessionId}`,
    },
  },
});

test("paid TR545D accessory-only order fulfils without touching 247 tyre inventory", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder({
    reference: "AWT-TEST-VALVE",
    checkoutSessionId: "sess_valve",
    paymentIntentId: null,
    amountTotalCents: 1000,
    currency: "aud",
    customerEmail: "buyer@example.invalid",
    customerName: "Test buyer",
    customerPhone: "0400000000",
    deliveryMethod: "pickup",
    deliveryAddress: "4 Birralee Rd, Regency Park SA 5010",
    notes: "",
    lines: [{
      id: "tr545d-truck-tyre-valve",
      brand: "TR545D",
      pattern: "TR545D Truck Tyre Valve",
      size: "60° Alloy Wheel Valve",
      quantity: 1,
      price: 10,
    }],
    inventoryReservationId: null,
    inventoryStatus: "committed",
    inventoryCommitRequestId: null,
    inventoryReleaseRequestId: null,
  });

  let commits = 0;
  let notifications = 0;
  await processStripeEvent(paidEvent("sess_valve"), {
    store,
    commitInventory: async () => {
      commits += 1;
      throw new Error("247 must not be called for an accessory-only order");
    },
    releaseInventory: async () => {
      throw new Error("247 release must not be called for an accessory-only order");
    },
    notify: async () => {
      notifications += 1;
      return { delivered: true };
    },
  });

  const order = await store.getByCheckoutSessionId("sess_valve");
  assert.equal(commits, 0);
  assert.equal(notifications, 1);
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(order.paymentIntentId, "pi_sess_valve");
  assert.ok(order.notifiedAt);
});
