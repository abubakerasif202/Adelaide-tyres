import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { processStripeEvent } from "../../lib/webhook-handlers.ts";
import { processInventoryOutbox } from "../../lib/inventory/outbox-worker.ts";
import { processOrderNotifications } from "../../lib/inventory/notification-worker.ts";
import { InventoryConflictError } from "../../lib/inventory/types.ts";
import { MAX_INVENTORY_ATTEMPTS } from "../../lib/order-store.ts";

// Inventory commit/release semantics of the signed Stripe webhook plus the
// durable outbox that finishes the job. 247 is the source of truth; a verified
// payment is the only thing allowed to commit stock, and nothing here may
// deduct twice, restock a sale, or revert a payment because 247 or email
// misbehaved. Scenario numbers refer to the reconciliation brief.

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
const refund = (sessionId, eventId, { amount = 45000, amountRefunded = 45000, refunded = amountRefunded >= amount } = {}) => ({
  id: eventId, type: "charge.refunded", data: { object: { payment_intent: `pi_${sessionId}`, refunded, amount, amount_refunded: amountRefunded } },
});

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

const advance = (store, ms) => { const base = store.now() + ms; store.now = () => base; };
const quiet = async (fn) => {
  const original = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = original; }
};

test("1. duplicate checkout.session.completed: two event ids for the same paid order commit inventory exactly once", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_10"));
  const notify = notifyOk();
  const inventory = inventoryDeps();

  await processStripeEvent(paid("sess_10", "evt_first"), { store, notify, ...inventory });
  await processStripeEvent(paid("sess_10", "evt_first"), { store, notify, ...inventory });
  await processStripeEvent(paid("sess_10", "evt_second"), { store, notify, ...inventory });
  await processStripeEvent(paid("sess_10", "evt_third", "checkout.session.async_payment_succeeded"), { store, notify, ...inventory });

  assert.equal(inventory.committed.length, 1);
  assert.deepEqual(inventory.committed[0], [RESERVATION, "AWT-TEST-sess_10", COMMIT_ID]);
  const order = await store.getByCheckoutSessionId("sess_10");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(notify.calls.length, 1);
  assert.equal(store.audit.filter((a) => a.eventType === "PAYMENT_CONFIRMED").length, 3, "each distinct Stripe event is audited once");
});

test("2. payment succeeds while 247 is unavailable: payment stays durable, commit retries under the same request id", async () => {
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

  // The webhook acknowledges: payment + outbox row are durable.
  await quiet(() => processStripeEvent(paid("sess_11", "evt_1"), { store, notify, commitInventory, releaseInventory }));
  let order = await store.getByCheckoutSessionId("sess_11");
  assert.equal(order.status, "paid", "payment is never reverted because 247 was down");
  assert.equal(order.inventoryStatus, "commit_pending", "inventory is never marked committed when 247 did not confirm");
  assert.equal(notify.calls.length, 0, "the business is not told about a sale whose stock is unconfirmed");

  // Stripe redelivery is a no-op; the cron worker owns the retry.
  await processStripeEvent(paid("sess_11", "evt_1"), { store, notify, commitInventory, releaseInventory });
  assert.equal(attempts, 1, "duplicate event does not retry before the backoff");

  advance(store, 60_000);
  await processInventoryOutbox({ store, commit: commitInventory, release: releaseInventory });
  await processOrderNotifications(store, notify);
  order = await store.getByCheckoutSessionId("sess_11");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(committed.length, 1);
  assert.equal(committed[0][2], COMMIT_ID, "retry reuses the durable commit request id so 247 deduplicates");
  assert.equal(notify.calls.length, 1);
});

test("3. inventory commit succeeds but the response is lost: the retry replays the same idempotent commit, no second deduction", async () => {
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

  await quiet(() => processStripeEvent(paid("sess_12", "evt_1"), { store, notify, commitInventory }));
  assert.deepEqual([ledger.onHand, ledger.reserved], [8, 0]);
  assert.equal((await store.getByCheckoutSessionId("sess_12")).inventoryStatus, "commit_pending");

  advance(store, 60_000);
  await processInventoryOutbox({ store, commit: commitInventory });
  assert.deepEqual([ledger.onHand, ledger.reserved], [8, 0], "no second deduction");
  assert.equal(ledger.seen.size, 1, "one commit identity across retries");
  const order = await store.getByCheckoutSessionId("sess_12");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
});

test("4. concurrent worker claims: many workers over one queue commit each order exactly once", async () => {
  const store = new MemoryOrderStore();
  const inventory = inventoryDeps();
  const slowCommit = async (...args) => { await new Promise((r) => setTimeout(r, 5)); return inventory.commitInventory(...args); };
  for (let i = 0; i < 6; i += 1) {
    await store.createPendingOrder(makeOrderInput(`sess_c${i}`, { inventoryReservationId: `00000000-0000-4000-8000-00000000c${i}00`, inventoryCommitRequestId: `00000000-0000-4000-8000-00000000c${i}01`, inventoryReleaseRequestId: `00000000-0000-4000-8000-00000000c${i}02` }));
    // Persist payment only — simulate the webhook process dying before its fast path.
    await store.confirmPaymentAndEnqueue({ checkoutSessionId: `sess_c${i}`, paymentIntentId: `pi_${i}`, stripeEventId: `evt_c${i}`, stripeEventType: "checkout.session.completed" });
  }
  await Promise.all(Array.from({ length: 4 }, (_, w) => processInventoryOutbox({ store, commit: slowCommit }, 25, `worker-${w}`)));
  assert.equal(inventory.committed.length, 6);
  assert.equal(new Set(inventory.committed.map(([, ref]) => ref)).size, 6, "no order committed twice");
  for (let i = 0; i < 6; i += 1) assert.equal((await store.getByCheckoutSessionId(`sess_c${i}`)).inventoryStatus, "committed");
});

test("5. stale worker lease: a worker that outlives its lease cannot overwrite the outcome of its replacement", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_lease"));
  await store.confirmPaymentAndEnqueue({ checkoutSessionId: "sess_lease", paymentIntentId: "pi", stripeEventId: "evt_lease", stripeEventType: "checkout.session.completed" });

  const stale = await store.claimInventoryWork("stale-worker");
  assert.equal(stale.operationId, COMMIT_ID);
  assert.equal(await store.claimInventoryWork("second-worker"), null, "an active lease blocks other workers");

  advance(store, 61_000);
  const fresh = await store.claimInventoryWork("fresh-worker");
  assert.equal(fresh.operationId, COMMIT_ID, "an expired lease is reclaimable");
  assert.equal(fresh.attemptCount, 2);

  // The stale worker wakes up and reports — both outcomes must be ignored.
  await store.retryInventoryWork(COMMIT_ID, "stale-worker", "timeout", true);
  assert.equal((await store.getByCheckoutSessionId("sess_lease")).inventoryStatus, "commit_pending");
  await store.completeInventoryWork(COMMIT_ID, "stale-worker");
  assert.equal((await store.getByCheckoutSessionId("sess_lease")).inventoryStatus, "commit_pending");

  await store.completeInventoryWork(COMMIT_ID, "fresh-worker");
  assert.equal((await store.getByCheckoutSessionId("sess_lease")).inventoryStatus, "committed");
});

test("6. full refund after payment: order closes as refunded, stock is never released or restocked, no further notification", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_16"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_16"), { store, notify, ...inventory });
  await processStripeEvent(refund("sess_16", "evt_refund"), { store, notify, ...inventory });
  await processStripeEvent(refund("sess_16", "evt_refund_dup"), { store, notify, ...inventory });

  const order = await store.getByCheckoutSessionId("sess_16");
  assert.equal(order.status, "refunded");
  assert.equal(order.inventoryStatus, "committed", "a physical return is a separate 247 inventory process");
  assert.equal(inventory.released.length, 0);
  assert.equal(inventory.committed.length, 1);
  assert.equal(notify.calls.length, 1);
});

test("6b. a late payment event after a full refund lands as refunded, never paid", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_late_refund"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(refund("sess_late_refund", "evt_r"), { store, notify, ...inventory });
  await processStripeEvent(paid("sess_late_refund"), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_late_refund");
  assert.equal(order.status, "refunded");
  assert.equal(notify.calls.length, 0, "a refunded order is never announced as a sale");
});

test("7. partial refund: the order stays paid and fulfilable; only an audit row is written", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_partial"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_partial"), { store, notify, ...inventory });
  await processStripeEvent(refund("sess_partial", "evt_partial", { amount: 45000, amountRefunded: 5000 }), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_partial");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(inventory.released.length, 0);
  const audit = store.audit.find((a) => a.eventType === "PARTIAL_REFUND_RECORDED");
  assert.deepEqual(audit.details, { amount: 45000, amountRefunded: 5000 });
});

test("8. expired event after payment never releases a committed sale", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_18"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_18"), { store, notify, ...inventory });
  await processStripeEvent(lifecycle("sess_18", "checkout.session.expired", "evt_late"), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_18");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(inventory.released.length, 0);
});

test("8b. expired event after payment but before the commit landed still never releases the hold", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_18b"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  let block = true;
  const commitInventory = async (...args) => { if (block) throw new Error("timeout"); return inventory.commitInventory(...args); };
  await quiet(() => processStripeEvent(paid("sess_18b"), { store, notify, commitInventory, releaseInventory: inventory.releaseInventory }));
  await processStripeEvent(lifecycle("sess_18b", "checkout.session.expired", "evt_late_b"), { store, notify, commitInventory, releaseInventory: inventory.releaseInventory });
  let order = await store.getByCheckoutSessionId("sess_18b");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "commit_pending");
  assert.equal(inventory.released.length, 0);
  block = false;
  advance(store, 60_000);
  await processInventoryOutbox({ store, commit: commitInventory, release: inventory.releaseInventory });
  order = await store.getByCheckoutSessionId("sess_18b");
  assert.equal(order.inventoryStatus, "committed");
});

test("9. async_payment_failed after payment is ignored: paid orders are never failed or released", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_apf"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_apf"), { store, notify, ...inventory });
  await processStripeEvent(lifecycle("sess_apf", "checkout.session.async_payment_failed", "evt_apf"), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_apf");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(inventory.released.length, 0);
});

test("10. a PaymentIntent assigned after Checkout Session creation is persisted and a later refund finds the order", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_pi", { paymentIntentId: null }));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_pi"), { store, notify, ...inventory });
  assert.equal((await store.getByCheckoutSessionId("sess_pi")).paymentIntentId, "pi_sess_pi");
  assert.equal((await store.getByPaymentIntentId("pi_sess_pi")).reference, "AWT-TEST-sess_pi");
  await processStripeEvent(refund("sess_pi", "evt_pi_refund"), { store, notify, ...inventory });
  assert.equal((await store.getByCheckoutSessionId("sess_pi")).status, "refunded");
});

test("11. email notification failure: payment and committed stock are untouched; delivery retries with backoff", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_mail"));
  const inventory = inventoryDeps();
  const outcomes = [() => { throw new Error("transport down"); }, () => ({ delivered: false }), () => ({ delivered: true })];
  const calls = [];
  const notify = async (message) => { calls.push(message); return outcomes[calls.length - 1](); };

  await processStripeEvent(paid("sess_mail"), { store, notify, ...inventory });
  let order = await store.getByCheckoutSessionId("sess_mail");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "committed");
  assert.equal(order.notifiedAt, null);

  advance(store, 30_000);
  await processOrderNotifications(store, notify);
  assert.equal((await store.getByCheckoutSessionId("sess_mail")).notifiedAt, null);
  advance(store, 60_000);
  await processOrderNotifications(store, notify);
  order = await store.getByCheckoutSessionId("sess_mail");
  assert.ok(order.notifiedAt);
  assert.equal(calls.length, 3);
  assert.equal(inventory.committed.length, 1, "email retries never touch 247");
  assert.ok(calls.every((m) => m.idempotencyKey === "paid-order/AWT-TEST-sess_mail"), "every attempt carries the same idempotency key");
});

test("12. process crash after durable payment but before the inventory commit: the cron worker finishes the job", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_crash"));
  // Only the transaction ran; the process died before the fast path.
  await store.confirmPaymentAndEnqueue({ checkoutSessionId: "sess_crash", paymentIntentId: "pi_sess_crash", stripeEventId: "evt_crash", stripeEventType: "checkout.session.completed" });
  let order = await store.getByCheckoutSessionId("sess_crash");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "commit_pending");

  const notify = notifyOk();
  const inventory = inventoryDeps();
  assert.deepEqual(await processInventoryOutbox({ store, ...{ commit: inventory.commitInventory } }), { processed: 1, completed: 1, retried: 0, manualReview: 0 });
  assert.deepEqual(await processOrderNotifications(store, notify), { delivered: 1, failed: 0 });
  order = await store.getByCheckoutSessionId("sess_crash");
  assert.equal(order.inventoryStatus, "committed");
  assert.ok(order.notifiedAt);
  assert.equal(inventory.committed.length, 1);
});

test("13. stock conflict after successful payment: no forced deduction, order parked for manual review and the business is told", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_conflict"));
  const notify = notifyOk();
  const commitInventory = async () => { throw new InventoryConflictError("The stock hold for this order is no longer active."); };
  await quiet(() => processStripeEvent(paid("sess_conflict"), { store, notify, commitInventory }));
  const order = await store.getByCheckoutSessionId("sess_conflict");
  assert.equal(order.status, "paid", "the customer's money is never silently forgotten");
  assert.equal(order.inventoryStatus, "manual_review");
  assert.equal(store.outbox.get(COMMIT_ID).state, "manual_review");
  assert.equal(notify.calls.length, 1);
  assert.match(notify.calls[0].subject, /NEEDS REVIEW/);
  assert.match(notify.calls[0].text, /ACTION REQUIRED/);
});

test("13b. persistent 247 outage: after the attempt cap the order goes to manual review instead of retrying forever", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_cap"));
  await store.confirmPaymentAndEnqueue({ checkoutSessionId: "sess_cap", paymentIntentId: "pi", stripeEventId: "evt_cap", stripeEventType: "checkout.session.completed" });
  let attempts = 0;
  const commit = async () => { attempts += 1; throw new Error("503"); };
  for (let i = 0; i < MAX_INVENTORY_ATTEMPTS + 3; i += 1) {
    advance(store, 3_600_000);
    await quiet(() => processInventoryOutbox({ store, commit }));
  }
  assert.equal(attempts, MAX_INVENTORY_ATTEMPTS);
  assert.equal((await store.getByCheckoutSessionId("sess_cap")).inventoryStatus, "manual_review");
});

test("14. duplicate inventory commit request: a second outbox pass for a committed order never calls 247 again", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_dupcommit"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_dupcommit"), { store, notify, ...inventory });
  await store.confirmPaymentAndEnqueue({ checkoutSessionId: "sess_dupcommit", paymentIntentId: "pi_sess_dupcommit", stripeEventId: "evt_other", stripeEventType: "checkout.session.async_payment_succeeded" });
  advance(store, 3_600_000);
  await processInventoryOutbox({ store, commit: inventory.commitInventory });
  await processInventoryOutbox({ store, commit: inventory.commitInventory });
  assert.equal(inventory.committed.length, 1);
  assert.equal(store.outbox.size, 1);
  assert.equal((await store.getByCheckoutSessionId("sess_dupcommit")).inventoryStatus, "committed");
});

test("15. genuinely unpaid checkouts: payment failure and expiry release the hold exactly once each, under the durable release id", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_13"));
  await store.createPendingOrder(makeOrderInput("sess_14", { inventoryReservationId: "00000000-0000-4000-8000-000000000014", inventoryReleaseRequestId: "00000000-0000-4000-8000-000000000015" }));
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
  assert.equal(notify.calls.length, 0);
});

test("release failure keeps the order recoverable and never falsely marks it released", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_15"));
  const notify = notifyOk();
  const releaseInventory = async () => { throw new Error("timeout"); };
  await quiet(() => processStripeEvent(lifecycle("sess_15", "checkout.session.expired", "evt_x1"), { store, notify, releaseInventory }));
  const order = await store.getByCheckoutSessionId("sess_15");
  assert.equal(order.status, "cancelled");
  assert.equal(order.inventoryStatus, "release_pending", "247 expiry and the outbox retry remain the safety net");
  assert.equal(store.outbox.get(RELEASE_ID).state, "pending");
});

test("a paid order missing its reservation is never fulfilled silently: parked for manual review, business told, webhook acknowledged", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_17", { inventoryReservationId: null, inventoryStatus: "pending", inventoryCommitRequestId: null }));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(paid("sess_17"), { store, notify, ...inventory });
  assert.equal(inventory.committed.length, 0);
  const order = await store.getByCheckoutSessionId("sess_17");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "manual_review");
  assert.equal(notify.calls.length, 1);
  assert.match(notify.calls[0].subject, /NEEDS REVIEW/);
});

test("a verified payment arriving after the hold was released goes straight to manual review, never a doomed commit", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_gone"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  await processStripeEvent(lifecycle("sess_gone", "checkout.session.expired", "evt_gone"), { store, notify, ...inventory });
  assert.equal((await store.getByCheckoutSessionId("sess_gone")).inventoryStatus, "released");
  await processStripeEvent(paid("sess_gone"), { store, notify, ...inventory });
  const order = await store.getByCheckoutSessionId("sess_gone");
  assert.equal(order.status, "paid", "money taken is authoritative");
  assert.equal(order.inventoryStatus, "manual_review");
  assert.equal(inventory.committed.length, 0);
  assert.equal(notify.calls.length, 1);
});

test("a verified payment supersedes a queued-but-unfinished release", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_race"));
  const notify = notifyOk();
  const inventory = inventoryDeps();
  const releaseInventory = async () => { throw new Error("offline"); };
  await quiet(() => processStripeEvent(lifecycle("sess_race", "checkout.session.expired", "evt_race"), { store, notify, releaseInventory }));
  await processStripeEvent(paid("sess_race"), { store, notify, ...inventory });
  advance(store, 3_600_000);
  await processInventoryOutbox({ store, ...{ commit: inventory.commitInventory, release: inventory.releaseInventory } });
  const order = await store.getByCheckoutSessionId("sess_race");
  assert.equal(order.status, "paid");
  assert.equal(order.inventoryStatus, "manual_review", "the hold state is uncertain, so an operator decides");
  assert.equal(store.outbox.get(RELEASE_ID).state, "cancelled", "the release never runs against a paid order");
  assert.equal(inventory.released.length, 0);
});

test("concurrent duplicate deliveries commit once even when the commit is slow", async () => {
  const store = new MemoryOrderStore();
  await store.createPendingOrder(makeOrderInput("sess_19"));
  const notify = notifyOk();
  const committed = [];
  const commitInventory = async (...args) => { await new Promise((r) => setTimeout(r, 20)); committed.push(args); return { status: "committed" }; };
  await Promise.all(Array.from({ length: 5 }, (_, i) => processStripeEvent(paid("sess_19", `evt_${i}`), { store, notify, commitInventory })));
  assert.equal(committed.length, 1);
  assert.equal(notify.calls.length, 1);
});
