import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { processStripeEvent } from "../../lib/webhook-handlers.ts";

// Inventory commit/release semantics of the signed Stripe webhook. 247 is the
// source of truth; the verified webhook is the only thing allowed to commit
// stock, and it must never deduct twice or restock on its own.

const RESERVATION = "00000000-0000-4000-8000-000000000001";
const COMMIT_ID = "00000000-0000-4000-8000-000000000002";
const RELEASE_ID = "00000000-0000-4000-8000-000000000003";

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
    inventoryReservationId: RESERVATION,
    inventoryStatus: "reserved",
    inventoryCommitRequestId: COMMIT_ID,
    inventoryReleaseRequestId: RELEASE_ID,
    ...overrides,
  };
}

const paid = (sessionId, eventId = `evt_${sessionId}`, type = "checkout.session.completed") => ({
  id: eventId, type, data: { object: { id: sessionId, payment_status: "paid", payment_intent: `pi_${sessionId}` } },
});
const lifecycle = (sessionId, type, eventId) => ({ id: eventId, type, data: { object: { id: sessionId } } });

function notifyOk() {
  const calls = [];
  const fn = async (message) => { calls.push(message); return { delivered: true }; };
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

const quiet = async (fn) => {
  const original = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = original; }
};

test("two different Stripe event ids for the same paid order commit inventory exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_10"));
  const notify = notifyOk();
  const inventory = inventoryDeps();

  await processStripeEvent(paid("sess_10", "evt_first"), { store, notify, ...inventory });
  await processStripeEvent(paid("sess_10", "evt_second"), { store, notify, ...inventory });
  await processStripeEvent(paid("sess_10", "evt_third", "checkout.session.async_payment_succeeded"), { store, notify, ...inventory });

  assert.equal(inventory.committed.length, 1);
  assert.deepEqual(inventory.committed[0], [RESERVATION, "AWT-TEST-sess_10", COMMIT_ID]);
  const order = await store.getByCheckoutSessionId("sess_10");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(notify.calls.length, 1);
});

test("payment succeeded but the inventory commit failed: order stays recoverable, retry commits once with the same request id", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_11"));
  const notify = notifyOk();
  const committed = [];
  let attempts = 0;
  const commitInventory = async (...args) => {
    attempts += 1;
    if (attempts === 1) throw new Error("We're confirming tyre availability. Please try again shortly.");
    committed.push(args);
    return { status: "committed" };
  };
  const releaseInventory = async () => { throw new Error("must not release a paid order"); };

  await assert.rejects(processStripeEvent(paid("sess_11", "evt_1"), { store, notify, commitInventory, releaseInventory }));
  let order = await store.getByCheckoutSessionId("sess_11");
  assert.equal(order.status, "pending", "claim released so Stripe redelivery can retry");
  assert.equal(order.inventoryStatus, "reserved", "inventory is never marked committed when 247 did not confirm");
  assert.equal(notify.calls.length, 0, "the business is not told about a sale whose stock is unconfirmed");

  await processStripeEvent(paid("sess_11", "evt_1"), { store, notify, commitInventory, releaseInventory });
  order = await store.getByCheckoutSessionId("sess_11");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(committed.length, 1);
  assert.equal(committed[0][2], COMMIT_ID, "retry reuses the durable commit request id so 247 deduplicates");
  assert.equal(notify.calls.length, 1);
});

test("lost commit response: 247 committed but Adelaide timed out; the webhook retry replays the same idempotent commit", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_12"));
  const notify = notifyOk();
  // Emulates 247's ledger: the first call deducts, then the response is lost.
  const ledger = { onHand: 10, reserved: 2, seen: new Set(), lost: false };
  const commitInventory = async (_reservationId, _reference, requestId) => {
    if (!ledger.seen.has(requestId)) { ledger.seen.add(requestId); ledger.onHand -= 2; ledger.reserved -= 2; }
    if (!ledger.lost) { ledger.lost = true; throw new Error("timeout"); }
    return { status: "committed" };
  };
  const releaseInventory = async () => ({ status: "released" });

  await assert.rejects(processStripeEvent(paid("sess_12", "evt_1"), { store, notify, commitInventory, releaseInventory }));
  assert.deepEqual([ledger.onHand, ledger.reserved], [8, 0]);
  await processStripeEvent(paid("sess_12", "evt_1_retry"), { store, notify, commitInventory, releaseInventory });
  assert.deepEqual([ledger.onHand, ledger.reserved], [8, 0], "no second deduction");
  assert.equal(ledger.seen.size, 1, "one commit identity across retries");
  const order = await store.getByCheckoutSessionId("sess_12");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
});

test("payment failure and session expiry release the hold once with the durable release request id", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_13"));
  await store.createPendingOrder(makeOrderInput("sess_14"));
  const notify = notifyOk();
  const inventory = inventoryDeps();

  await processStripeEvent(lifecycle("sess_13", "checkout.session.async_payment_failed", "evt_f1"), { store, notify, ...inventory });
  await processStripeEvent(lifecycle("sess_13", "checkout.session.async_payment_failed", "evt_f2"), { store, notify, ...inventory });
  await processStripeEvent(lifecycle("sess_14", "checkout.session.expired", "evt_e1"), { store, notify, ...inventory });
  await processStripeEvent(lifecycle("sess_14", "checkout.session.expired", "evt_e2"), { store, notify, ...inventory });

  assert.equal(inventory.released.length, 2);
  assert.deepEqual(inventory.released[0], [RESERVATION, "payment_not_completed", RELEASE_ID]);
  assert.equal((await store.getByCheckoutSessionId("sess_13")).inventoryStatus, "released");
  assert.equal((await store.getByCheckoutSessionId("sess_14")).inventoryStatus, "released");
  assert.equal(inventory.committed.length, 0);
});

test("expiry after payment never releases a committed sale", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_18"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_18"), { store, notify, ...inventory });
  await processStripeEvent(lifecycle("sess_18", "checkout.session.expired", "evt_late"), { store, notify, ...inventory });
  assert.equal(inventory.released.length, 0);
  assert.equal((await store.getByCheckoutSessionId("sess_18")).inventoryStatus, "committed");
});

test("release failure returns non-2xx and does not falsely mark the order released", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_15"));
  const notify = notifyOk();
  const releaseInventory = async () => { throw new Error("timeout"); };
  const commitInventory = async () => { throw new Error("no"); };
  await quiet(() => assert.rejects(processStripeEvent(lifecycle("sess_15", "checkout.session.expired", "evt_x1"), { store, notify, releaseInventory, commitInventory })));
  const order = await store.getByCheckoutSessionId("sess_15");
  assert.equal(order.status, "cancelled");
  assert.equal(order.inventoryStatus, "reserved", "247 expiry and reconciliation remain the safety net");
});

test("a refund never releases or restocks inventory automatically", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_16"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_16"), { store, notify, ...inventory });
  await processStripeEvent({ id: "evt_refund", type: "charge.refunded", data: { object: { payment_intent: "pi_sess_16" } } }, { store, notify, ...inventory });
  await processStripeEvent({ id: "evt_refund_dup", type: "charge.refunded", data: { object: { payment_intent: "pi_sess_16" } } }, { store, notify, ...inventory });

  const order = await store.getByCheckoutSessionId("sess_16");
  assert.equal(order.status, "refunded");
  assert.equal(order.inventoryStatus, "committed", "a physical return is a separate 247 inventory process");
  assert.equal(inventory.released.length, 0);
  assert.equal(inventory.committed.length, 1);
});

test("a paid order missing its reservation is never fulfilled silently", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_17", { inventoryReservationId: null, inventoryStatus: "pending", inventoryCommitRequestId: null }));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await assert.rejects(processStripeEvent(paid("sess_17"), { store, notify, ...inventory }));
  assert.equal(inventory.committed.length, 0);
  assert.equal(notify.calls.length, 0);
  assert.equal((await store.getByCheckoutSessionId("sess_17")).status, "pending", "left recoverable for operator reconciliation");
});

test("concurrent duplicate deliveries commit once even when the commit is slow", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_19"));
  const notify = notifyOk();
  const committed = [];
  const commitInventory = async (...args) => { await new Promise((r) => setTimeout(r, 20)); committed.push(args); return { status: "committed" }; };
  await Promise.all(Array.from({ length: 5 }, (_, i) => processStripeEvent(paid("sess_19", `evt_${i}`), { store, notify, commitInventory, releaseInventory: async () => ({ status: "released" }) })));
  assert.equal(committed.length, 1);
  assert.equal(notify.calls.length, 1);
});
