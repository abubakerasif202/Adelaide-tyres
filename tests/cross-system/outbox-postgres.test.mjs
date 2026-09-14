import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { PostgresOrderStore } from '../../lib/order-store-postgres.ts';
import { processInventoryOutbox } from '../../lib/inventory/outbox-worker.ts';
import { processOrderNotifications } from '../../lib/inventory/notification-worker.ts';

const target = new URL(process.env.DATABASE_URL ?? '');
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55332');
assert.equal(target.pathname, '/awt_hardening_rehearsal');
const sql = postgres(target.href, { max: 4 });
after(() => sql.end());
const store = new PostgresOrderStore();
const second = new PostgresOrderStore();

async function fixture(missing = false) {
  const id = randomUUID();
  await store.createPendingOrder({ reference: id, checkoutSessionId: id, paymentIntentId: null,
    amountTotalCents: 100, currency: 'aud', customerEmail: 'fixture@example.test', customerName: 'Test fixture',
    customerPhone: '000', deliveryMethod: 'pickup', deliveryAddress: 'Fixture', notes: '', lines: [],
    inventoryReservationId: missing ? null : randomUUID(), inventoryCommitRequestId: missing ? null : randomUUID(),
    inventoryStatus: 'reserved', inventoryReleaseRequestId: randomUUID() });
  return { checkoutSessionId: id, paymentIntentId: `pi_${id}`, stripeEventId: `evt_${id}`, stripeEventType: 'checkout.session.completed' };
}

test('payment/outbox/audit roll back together on an audit persistence failure', async () => {
  const input = await fixture();
  await sql.unsafe("create function reject_test_audit() returns trigger language plpgsql as $$ begin raise exception 'fixture audit failure'; end $$; create trigger reject_test_audit before insert on order_inventory_audit for each row execute function reject_test_audit()");
  try {
    await assert.rejects(store.confirmPaymentAndEnqueue(input));
    assert.equal((await store.getByCheckoutSessionId(input.checkoutSessionId)).status, 'pending');
    assert.equal((await sql`select * from inventory_outbox where order_reference=${input.checkoutSessionId}`).length, 0);
    assert.equal((await sql`select * from stripe_events where event_id=${input.stripeEventId}`).length, 0);
  } finally { await sql.unsafe('drop trigger reject_test_audit on order_inventory_audit; drop function reject_test_audit()'); }
});

test('concurrent payment events preserve active lease; expired lease fences stale owner', async () => {
  const input = await fixture();
  await store.confirmPaymentAndEnqueue(input);
  const work = await store.claimInventoryWork('first');
  await Promise.all([store.confirmPaymentAndEnqueue({ ...input,stripeEventId: randomUUID() }), second.confirmPaymentAndEnqueue({ ...input,stripeEventId: randomUUID() })]);
  assert.equal(await second.claimInventoryWork('second'), null);
  const [row] = await sql`select * from inventory_outbox where operation_id=${work.operationId}`;
  assert.equal(row.lease_owner,'first');
  await sql`update inventory_outbox set lease_expires_at=now()-interval '1 second' where operation_id=${work.operationId}`;
  assert.equal((await second.claimInventoryWork('second')).operationId,work.operationId);
  await store.completeInventoryWork(work.operationId,'first');
  assert.equal((await store.getByReference(work.orderReference)).inventoryStatus,'commit_pending');
  await second.completeInventoryWork(work.operationId,'second');
  assert.equal((await store.getByReference(work.orderReference)).inventoryStatus,'committed');
});

test('lost response is retried by separate worker with stable identity and notification without webhook', async () => {
  // Finish notification from the preceding fixture before testing this order.
  await processOrderNotifications(store,async () => ({delivered:true}));
  const input = await fixture();
  await store.confirmPaymentAndEnqueue(input);
  const seen = new Set(); let deductions=0; let calls=0;
  const commit = async (_id,_ref,key) => { calls++; if (!seen.has(key)) {seen.add(key); deductions++;} if(calls===1) throw new Error('lost response'); return {status:'committed'}; };
  await processInventoryOutbox({store,commit},1);
  assert.equal((await store.getByCheckoutSessionId(input.checkoutSessionId)).status,'paid');
  assert.equal((await sql`select fulfilment_ready_at from orders where reference=${input.checkoutSessionId}`)[0].fulfilment_ready_at,null);
  await store.confirmPaymentAndEnqueue({...input,stripeEventId:randomUUID()});
  assert.equal(await second.claimInventoryWork('too-early'),null,'duplicate event must preserve retry backoff');
  await sql`update inventory_outbox set next_attempt_at=now() where order_reference=${input.checkoutSessionId}`;
  await processInventoryOutbox({store:second,commit},1);
  assert.equal(deductions,1); assert.equal(calls,2); assert.equal(seen.size,1);
  let notifications=0;
  await Promise.all([processOrderNotifications(store,async () => {notifications++; return {delivered:true};}), processOrderNotifications(second,async () => {notifications++;return {delivered:true};})]);
  assert.equal(notifications,1);
  assert.ok((await store.getByCheckoutSessionId(input.checkoutSessionId)).notifiedAt);
});

test('missing reservation is durable manual review with fulfilment blocked', async () => {
  const input=await fixture(true); await store.confirmPaymentAndEnqueue(input);
  const row=await store.getByCheckoutSessionId(input.checkoutSessionId);
  assert.equal(row.status,'paid'); assert.equal(row.inventoryStatus,'manual_review');
  assert.equal(await store.claimInventoryWork('missing'),null);
});

test('a partial refund is recorded durably without touching payment or fulfilment state', async () => {
  const input=await fixture(); await store.confirmPaymentAndEnqueue(input);
  await processInventoryOutbox({store,commit:async () => ({status:'committed'})},1);
  await second.recordPartialRefund(input.paymentIntentId,'evt_partial',{amount:100,amountRefunded:25});
  const row=await store.getByReference(input.checkoutSessionId);
  assert.equal(row.status,'paid'); assert.equal(row.inventoryStatus,'committed');
  assert.ok((await sql`select fulfilment_ready_at from orders where reference=${input.checkoutSessionId}`)[0].fulfilment_ready_at);
  const audit=await sql`select event_type,stripe_event_id,details from order_inventory_audit where order_reference=${input.checkoutSessionId} and event_type='PARTIAL_REFUND_RECORDED'`;
  assert.equal(audit.length,1); assert.equal(audit[0].stripe_event_id,'evt_partial'); assert.deepEqual(audit[0].details,{amount:100,amountRefunded:25});
  assert.ok(await store.claimNotification('after-partial'),'still notifiable');
});

test('refund received before paid confirmation survives out-of-order delivery', async () => {
  const input=await fixture();
  await second.recordRefund(input.paymentIntentId,randomUUID());
  await store.confirmPaymentAndEnqueue(input);
  assert.equal((await store.getByReference(input.checkoutSessionId)).status,'refunded');
  await processInventoryOutbox({store,commit:async () => ({status:'committed'})},1);
  assert.equal(await store.claimNotification('refunded'),null);
});

test('notification failure and crashed claims recover; refunds are not notification eligible', async () => {
  const input=await fixture(); await store.confirmPaymentAndEnqueue(input);
  await processInventoryOutbox({store,commit:async () => ({status:'committed'})},1);
  const first=await store.claimNotification('crashed'); assert.equal(first.reference,input.checkoutSessionId);
  assert.equal(await second.claimNotification('other'),null);
  await sql`update orders set notify_claimed_at=now()-interval '61 seconds' where reference=${input.checkoutSessionId}`;
  assert.equal((await second.claimNotification('recovered')).reference,input.checkoutSessionId);
  await store.finishNotification(input.checkoutSessionId,'crashed',true);
  assert.equal((await store.getByReference(input.checkoutSessionId)).notifiedAt,null);
  await second.finishNotification(input.checkoutSessionId,'recovered',false);
  assert.equal((await store.getByReference(input.checkoutSessionId)).status,'paid');
  assert.equal(await store.claimNotification('early'),null);
  await store.transitionPaidToRefunded(input.paymentIntentId);
  await sql`update orders set notification_next_attempt_at=now() where reference=${input.checkoutSessionId}`;
  assert.equal(await store.claimNotification('after-refund'),null);
  assert.equal((await sql`select fulfilment_ready_at from orders where reference=${input.checkoutSessionId}`)[0].fulfilment_ready_at,null);
});
