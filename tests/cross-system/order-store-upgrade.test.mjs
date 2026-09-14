/**
 * Forward-migration rehearsal for the order store: a LOCAL disposable database
 * is built at the previously deployed schema (001 + 002), filled with
 * representative orders written under that schema, then upgraded with 003.
 * The store code is then run against the upgraded rows.
 *
 * Requires the local Supabase Postgres (LOCAL_PG_ADMIN_URL, loopback only).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { prepareLocalOrderDatabase } from "../../scripts/prepare-local-order-db.mjs";

const DB = "awt_upgrade_rehearsal";
let url;
let sql;

const base = (reference, overrides = {}) => ({
  reference, checkout_session_id: `cs_${reference}`, payment_intent_id: `pi_${reference}`, status: "pending",
  amount_total_cents: 45000, currency: "aud", customer_email: "u@example.test", customer_name: "Upgrade fixture",
  customer_phone: "0400000000", delivery_method: "pickup", delivery_address: "Fixture", order_notes: "",
  lines: [{ id: "t1", brand: "Ralson", pattern: "RMR61", size: "295/80R22.5", quantity: 2, price: 450 }],
  inventory_reservation_id: randomUUID(), inventory_status: "reserved", inventory_commit_request_id: randomUUID(),
  inventory_release_request_id: randomUUID(), notify_claimed_at: null, notified_at: null, inventory_committed_at: null,
  ...overrides,
});

const seeds = {
  pending: base("UPG-PENDING"),
  paidAwaitingCommit: base("UPG-PAID-RESERVED", { status: "paid", notify_claimed_at: new Date(Date.now() - 3 * 60_000).toISOString() }),
  paidCommittedNotified: base("UPG-PAID-DONE", { status: "paid", inventory_status: "committed", inventory_committed_at: new Date().toISOString(), notified_at: new Date().toISOString() }),
  paidNoReservation: base("UPG-PAID-NORES", { status: "paid", inventory_reservation_id: null, inventory_commit_request_id: null, inventory_status: "failed" }),
  refunded: base("UPG-REFUNDED", { status: "refunded", inventory_status: "committed", inventory_committed_at: new Date().toISOString(), notified_at: new Date().toISOString() }),
  cancelledReleased: base("UPG-CANCELLED", { status: "cancelled", inventory_status: "released" }),
};

before(async () => {
  url = await prepareLocalOrderDatabase({ name: DB, uptoPrefix: "002", recreate: true });
  sql = postgres(url, { max: 2 });
  for (const row of Object.values(seeds)) await sql`insert into orders ${sql({ ...row, lines: sql.json(row.lines) })}`;
  await sql`insert into stripe_events (event_id, event_type, checkout_session_id) values ('evt_upg_1', 'checkout.session.completed', ${seeds.paidAwaitingCommit.checkout_session_id})`;
  // The pre-upgrade schema must not know the new states or relations.
  await assert.rejects(sql`update orders set inventory_status = 'commit_pending' where reference = 'UPG-PENDING'`, /check constraint/);
  assert.equal((await sql`select to_regclass('inventory_outbox') as r`)[0].r, null);
  await prepareLocalOrderDatabase({ name: DB });
});
after(async () => { await sql?.end(); });

const order = async (reference) => (await sql`select * from orders where reference = ${reference}`)[0];

test("003 backfills a durable commit for every paid-but-uncommitted order and leaves settled history alone", async () => {
  const awaiting = await order("UPG-PAID-RESERVED");
  assert.equal(awaiting.inventory_status, "commit_pending");
  assert.equal(awaiting.notified_at, null);
  const [outbox] = await sql`select * from inventory_outbox where order_reference = 'UPG-PAID-RESERVED'`;
  assert.ok(outbox, "a commit outbox row exists");
  assert.equal(outbox.operation_id, seeds.paidAwaitingCommit.inventory_commit_request_id, "the outbox identity is the order's durable commit request id");
  assert.equal(outbox.request_id, seeds.paidAwaitingCommit.inventory_commit_request_id);
  assert.equal(outbox.reservation_id, seeds.paidAwaitingCommit.inventory_reservation_id);
  assert.equal(outbox.state, "pending");
  assert.equal(outbox.attempt_count, 0);

  const missing = await order("UPG-PAID-NORES");
  assert.equal(missing.inventory_status, "manual_review", "paid without a reservation is visible manual review");
  assert.equal((await sql`select count(*)::int as n from inventory_outbox where order_reference = 'UPG-PAID-NORES'`)[0].n, 0);

  for (const [reference, expected] of [["UPG-PENDING", "reserved"], ["UPG-PAID-DONE", "committed"], ["UPG-REFUNDED", "committed"], ["UPG-CANCELLED", "released"]]) {
    const row = await order(reference);
    assert.equal(row.inventory_status, expected, `${reference} keeps its inventory status`);
    assert.equal(row.status, seeds[Object.keys(seeds).find((k) => seeds[k].reference === reference)].status);
  }
  assert.equal((await sql`select count(*)::int as n from inventory_outbox`)[0].n, 1, "only the paid-uncommitted order is queued");
  assert.equal((await sql`select count(*)::int as n from stripe_events`)[0].n, 1, "event history is preserved");

  const [added] = await sql`select notification_attempts, notification_next_attempt_at, fulfilment_ready_at from orders where reference = 'UPG-PAID-DONE'`;
  assert.equal(added.notification_attempts, 0);
  assert.ok(added.notification_next_attempt_at);
  assert.equal(added.fulfilment_ready_at, null);
});

test("row-level security is enabled on every order relation and the app roles hold no grants", async () => {
  const rows = await sql`select relname, relrowsecurity from pg_class where relname in ('orders','stripe_events','inventory_outbox','order_inventory_audit','order_refund_receipts') order by relname`;
  assert.deepEqual(rows.map((r) => [r.relname, r.relrowsecurity]), [["inventory_outbox", true], ["order_inventory_audit", true], ["order_refund_receipts", true], ["orders", true], ["stripe_events", true]]);
  const grants = await sql`select grantee, table_name from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon','authenticated','service_role','public')`;
  assert.deepEqual([...grants], [], "no application role may reach the order relations directly");
});

test("the upgraded store drives the backfilled work to completion exactly once", async () => {
  process.env.DATABASE_URL = url;
  const { PostgresOrderStore } = await import("../../lib/order-store-postgres.ts");
  const { processInventoryOutbox } = await import("../../lib/inventory/outbox-worker.ts");
  const { processOrderNotifications } = await import("../../lib/inventory/notification-worker.ts");
  const store = new PostgresOrderStore();
  try {
    assert.equal(await store.claimNotification("early"), null, "nothing is notifiable before the sale is committed");
    const seen = [];
    const commit = async (reservationId, orderReference, requestId) => { seen.push({ reservationId, orderReference, requestId }); return { status: "committed" }; };
    assert.deepEqual(await processInventoryOutbox({ store, commit }, 25), { processed: 1, completed: 1, retried: 0, manualReview: 0 });
    assert.deepEqual(seen, [{ reservationId: seeds.paidAwaitingCommit.inventory_reservation_id, orderReference: "UPG-PAID-RESERVED", requestId: seeds.paidAwaitingCommit.inventory_commit_request_id }]);
    assert.deepEqual(await processInventoryOutbox({ store, commit }, 25), { processed: 0, completed: 0, retried: 0, manualReview: 0 });
    const done = await order("UPG-PAID-RESERVED");
    assert.equal(done.inventory_status, "committed");
    assert.ok(done.fulfilment_ready_at);

    const notified = [];
    assert.deepEqual(await processOrderNotifications(store, async (message) => { notified.push(message.idempotencyKey); return { delivered: true }; }), { delivered: 1, failed: 0 });
    assert.deepEqual(notified, ["paid-order/UPG-PAID-RESERVED"]);
    assert.ok((await order("UPG-PAID-RESERVED")).notified_at);
    assert.equal(await store.claimNotification("again"), null);
    const audit = await sql`select event_type from order_inventory_audit where order_reference = 'UPG-PAID-RESERVED' order by id`;
    assert.deepEqual(audit.map((r) => r.event_type), ["INVENTORY_COMMITTED", "NOTIFICATION_CLAIMED", "NOTIFICATION_DELIVERED"]);
  } finally {
    delete process.env.DATABASE_URL;
    await store.close?.();
  }
});
