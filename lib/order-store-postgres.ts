import "server-only";
import postgres from "postgres";
import type { InventoryWork, NewOrderInput, OrderLine, OrderRecord, OrderStatus, OrderStore } from "./order-store.ts";

type OrderRow = {
  reference: string;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  status: OrderStatus;
  amount_total_cents: number;
  currency: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  delivery_method: string;
  delivery_address: string;
  order_notes: string;
  lines: OrderLine[];
  notified_at: string | null;
  inventory_reservation_id: string | null;
  inventory_status: OrderRecord["inventoryStatus"];
  inventory_commit_request_id: string | null;
  inventory_release_request_id: string | null;
};

function fromRow(row: OrderRow): OrderRecord {
  return {
    reference: row.reference,
    checkoutSessionId: row.checkout_session_id,
    paymentIntentId: row.payment_intent_id,
    status: row.status,
    amountTotalCents: row.amount_total_cents,
    currency: row.currency,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryMethod: row.delivery_method,
    deliveryAddress: row.delivery_address,
    notes: row.order_notes,
    lines: row.lines,
    notifiedAt: row.notified_at,
    inventoryReservationId: row.inventory_reservation_id,
    inventoryStatus: row.inventory_status,
    inventoryCommitRequestId: row.inventory_commit_request_id,
    inventoryReleaseRequestId: row.inventory_release_request_id,
  };
}

/**
 * Postgres implementation (any standard Postgres provider — currently
 * Supabase). Every state transition is a single guarded UPDATE/INSERT
 * statement — the WHERE clause encodes the precondition, so concurrent or
 * duplicate callers race safely at the database level instead of relying on
 * application-level locking.
 *
 * Uses postgres.js over the standard Postgres wire protocol (not a
 * provider-specific HTTP driver), so this works against any Postgres,
 * pooled or direct. `prepare: false` is required for Supabase's transaction
 * pooler (pgbouncer in transaction mode doesn't support prepared
 * statements) and is harmless against a direct connection.
 */
export class PostgresOrderStore implements OrderStore {
  async recordRefund(paymentIntentId: string, eventId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${paymentIntentId},0))`;
      await tx`insert into order_refund_receipts(payment_intent_id,stripe_event_id) values (${paymentIntentId},${eventId}) on conflict do nothing`;
      const rows = await tx`update orders set status='refunded',fulfilment_ready_at=null,updated_at=now() where payment_intent_id=${paymentIntentId} returning reference`;
      for (const row of rows) await tx`insert into order_inventory_audit(order_reference,event_type,stripe_event_id) values (${row.reference},'REFUND_CONFIRMED',${eventId})`;
    });
  }
  async recordPartialRefund(paymentIntentId: string, eventId: string, amounts: { amount: number | null; amountRefunded: number | null }): Promise<void> {
    await this.sql`insert into order_inventory_audit(order_reference,event_type,stripe_event_id,details)
      select reference,'PARTIAL_REFUND_RECORDED',${eventId},${this.sql.json({ amount: amounts.amount, amountRefunded: amounts.amountRefunded })}
      from orders where payment_intent_id=${paymentIntentId}`;
  }
  async claimNotification(workerId: string): Promise<OrderRecord | null> {
    return this.sql.begin(async (tx) => {
      const rows = (await tx`
        with candidate as (
          select id from orders where status='paid' and inventory_status='committed'
            and checkout_session_id is not null and notified_at is null
            and notification_next_attempt_at <= now()
            and (notify_claimed_at is null or notify_claimed_at < now()-interval '60 seconds')
          order by notification_next_attempt_at,id for update skip locked limit 1
        ) update orders o set notify_claimed_at=now(),notification_owner=${workerId},
          notification_attempts=notification_attempts+1
          from candidate where o.id=candidate.id returning o.*
      `) as unknown as OrderRow[];
      if (!rows[0]) return null;
      await tx`insert into order_inventory_audit(order_reference,event_type) values (${rows[0].reference},'NOTIFICATION_CLAIMED')`;
      return fromRow(rows[0]);
    });
  }

  async finishNotification(checkoutSessionId: string, workerId: string, delivered: boolean): Promise<void> {
    await this.sql.begin(async (tx) => {
      const rows = await tx`update orders set notified_at=case when ${delivered} then now() else notified_at end,
        notify_claimed_at=null,notification_owner=null,
        notification_next_attempt_at=now()+make_interval(secs => least(3600,15*power(2,least(notification_attempts,8))::int))
        where checkout_session_id=${checkoutSessionId} and notification_owner=${workerId}
          and notify_claimed_at > now()-interval '60 seconds' returning reference`;
      if (rows[0]) await tx`insert into order_inventory_audit(order_reference,event_type)
        values (${rows[0].reference},${delivered ? 'NOTIFICATION_DELIVERED' : 'NOTIFICATION_RETRY_SCHEDULED'})`;
    });
  }
  private sql: ReturnType<typeof postgres>;

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("PostgresOrderStore requires DATABASE_URL or POSTGRES_URL.");
    }
    this.sql = postgres(connectionString, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  }

  async createPendingOrder(order: NewOrderInput): Promise<void> {
    await this.sql`
      insert into orders (
        reference, checkout_session_id, payment_intent_id, status,
        amount_total_cents, currency, customer_email, customer_name,
        customer_phone, delivery_method, delivery_address, order_notes, lines,
        inventory_reservation_id, inventory_status, inventory_commit_request_id, inventory_release_request_id
      ) values (
        ${order.reference}, ${order.checkoutSessionId}, ${order.paymentIntentId}, 'pending',
        ${order.amountTotalCents}, ${order.currency}, ${order.customerEmail}, ${order.customerName},
        ${order.customerPhone}, ${order.deliveryMethod}, ${order.deliveryAddress}, ${order.notes},
        ${this.sql.json(order.lines)}, ${order.inventoryReservationId ?? null}, ${order.inventoryStatus ?? 'pending'},
        ${order.inventoryCommitRequestId ?? null}, ${order.inventoryReleaseRequestId ?? null}
      )
      on conflict (reference) do nothing
    `;
  }

  async claimFulfilment(checkoutSessionId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`
      update orders
      set notify_claimed_at = now(), updated_at = now()
      where checkout_session_id = ${checkoutSessionId}
        and status = 'paid'
        and inventory_status = 'committed'
        and notify_claimed_at is null
        and notified_at is null
      returning *
    `) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async confirmPaymentAndEnqueue(input: { checkoutSessionId: string; paymentIntentId: string | null; stripeEventId: string; stripeEventType: string }): Promise<OrderRecord | null> {
    return this.sql.begin(async (tx) => {
      if (input.paymentIntentId) await tx`select pg_advisory_xact_lock(hashtextextended(${input.paymentIntentId},0))`;
      const inserted = await tx`
        insert into stripe_events (event_id, event_type, checkout_session_id)
        values (${input.stripeEventId}, ${input.stripeEventType}, ${input.checkoutSessionId})
        on conflict (event_id) do nothing returning event_id
      `;
      const rows = (await tx`select * from orders where checkout_session_id = ${input.checkoutSessionId} for update`) as unknown as OrderRow[];
      const current = rows[0];
      if (!current) throw new Error('ORDER_NOT_PERSISTED');
      if (inserted.length === 0) return fromRow(current);

      const refunds = input.paymentIntentId ? await tx`select 1 from order_refund_receipts where payment_intent_id=${input.paymentIntentId}` : [];
      const nextStatus = current.status === "refunded" || refunds.length > 0 ? "refunded" : "paid";
      const canCommit = Boolean(current.inventory_reservation_id && current.inventory_commit_request_id);
      const inventoryStatus = current.inventory_status === "committed" ? "committed" : canCommit ? "commit_pending" : "manual_review";
      const updated = (await tx`
        update orders set status = ${nextStatus}, payment_intent_id = coalesce(${input.paymentIntentId}, payment_intent_id),
          inventory_status = case when inventory_status in ('committed','manual_review','commit_pending') then inventory_status else ${inventoryStatus} end, updated_at = now()
        where reference = ${current.reference} returning *
      `) as unknown as OrderRow[];
      if (inventoryStatus === "commit_pending" && current.inventory_reservation_id && current.inventory_commit_request_id) {
        await tx`
          insert into inventory_outbox (operation_id, order_reference, operation, reservation_id, request_id)
          values (${current.inventory_commit_request_id}, ${current.reference}, 'commit', ${current.inventory_reservation_id}, ${current.inventory_commit_request_id})
          on conflict (order_reference, operation) do nothing
        `;
      }
      await tx`insert into order_inventory_audit(order_reference,event_type,stripe_event_id,operation_id,details)
        values (${current.reference},'PAYMENT_CONFIRMED',${input.stripeEventId},${current.inventory_commit_request_id},${tx.json({ paymentIntentId: input.paymentIntentId })})`;
      return fromRow(updated[0]);
    });
  }

  async claimInventoryWork(workerId: string, leaseSeconds = 60): Promise<InventoryWork | null> {
    const rows = await this.sql`
      with candidate as (
        select operation_id from inventory_outbox
        where (state = 'pending' or (state = 'processing' and lease_expires_at <= now()))
        and next_attempt_at <= now()
        order by next_attempt_at, created_at, operation_id
        for update skip locked limit 1
      )
      update inventory_outbox o set state='processing', lease_owner=${workerId},
        lease_expires_at=now()+make_interval(secs => ${leaseSeconds}), attempt_count=o.attempt_count+1,
        last_attempt_at=now(), updated_at=now()
      from candidate where o.operation_id=candidate.operation_id
      returning o.operation_id, o.order_reference, o.operation, o.reservation_id, o.request_id, o.attempt_count
    `;
    const row = rows[0];
    return row ? { operationId: String(row.operation_id), orderReference: String(row.order_reference), operation: row.operation as "commit" | "release", reservationId: String(row.reservation_id), requestId: String(row.request_id), attemptCount: Number(row.attempt_count) } : null;
  }

  async completeInventoryWork(operationId: string, workerId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      const rows = await tx`update inventory_outbox set state='completed', completed_at=now(), lease_owner=null,
        lease_expires_at=null,last_error_code=null,updated_at=now()
        where operation_id=${operationId} and state='processing' and lease_owner=${workerId} returning order_reference,operation`;
      if (!rows[0]) return;
      if (rows[0].operation === 'commit') await tx`update orders set inventory_status='committed',inventory_committed_at=now(),
        fulfilment_ready_at=case when status='paid' then now() else null end,updated_at=now() where reference=${rows[0].order_reference}`;
      else await tx`update orders set inventory_status='released',inventory_released_at=now(),updated_at=now() where reference=${rows[0].order_reference}`;
      await tx`insert into order_inventory_audit(order_reference,event_type,operation_id)
        values (${rows[0].order_reference},${rows[0].operation === 'commit' ? 'INVENTORY_COMMITTED' : 'INVENTORY_RELEASED'},${operationId})`;
    });
  }

  async retryInventoryWork(operationId: string, workerId: string, errorCode: string, manualReview = false): Promise<void> {
    await this.sql.begin(async (tx) => {
      const rows = await tx`update inventory_outbox set state=${manualReview ? 'manual_review' : 'pending'}, lease_owner=null,
        lease_expires_at=null,last_error_code=${errorCode.slice(0,80)},
        next_attempt_at=now()+make_interval(secs => least(3600, power(2,greatest(0,attempt_count-1))::int*15)),updated_at=now()
        where operation_id=${operationId} and state='processing' and lease_owner=${workerId} returning order_reference,attempt_count`;
      if (!rows[0]) return;
      await tx`update orders set inventory_status=${manualReview ? 'manual_review' : 'commit_pending'},fulfilment_ready_at=null,updated_at=now() where reference=${rows[0].order_reference}`;
      await tx`insert into order_inventory_audit(order_reference,event_type,operation_id,details)
        values (${rows[0].order_reference},${manualReview ? 'INVENTORY_MANUAL_REVIEW' : 'INVENTORY_RETRY_SCHEDULED'},${operationId},${tx.json({ errorCode: errorCode.slice(0,80), attemptCount: Number(rows[0].attempt_count) })})`;
    });
  }

  async markNotified(checkoutSessionId: string): Promise<void> {
    await this.sql`
      update orders set notified_at = now(), updated_at = now()
      where checkout_session_id = ${checkoutSessionId}
    `;
  }

  async releaseFulfilmentClaim(checkoutSessionId: string): Promise<void> {
    await this.sql`
      update orders
      set notify_claimed_at = null, updated_at = now()
      where checkout_session_id = ${checkoutSessionId}
        and notified_at is null and status in ('paid','refunded')
    `;
  }

  async transitionPendingTo(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean> {
    const rows = await this.sql`
      update orders set status = ${status}, updated_at = now()
      where checkout_session_id = ${checkoutSessionId} and status = 'pending'
      returning checkout_session_id
    `;
    return rows.length > 0;
  }

  async transitionPaidToRefunded(paymentIntentId: string): Promise<boolean> {
    const rows = await this.sql`
      update orders set status = 'refunded', fulfilment_ready_at = null, updated_at = now()
      where payment_intent_id = ${paymentIntentId} and status = 'paid'
      returning checkout_session_id
    `;
    return rows.length > 0;
  }

  async releaseStaleClaims(olderThanMinutes: number): Promise<number> {
    const rows = await this.sql`
      update orders
      set notify_claimed_at = null, updated_at = now()
      where status = 'paid'
        and notified_at is null
        and notify_claimed_at is not null
        and notify_claimed_at < now() - make_interval(mins => ${olderThanMinutes})
      returning checkout_session_id
    `;
    return rows.length;
  }

  async getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`
      select * from orders where checkout_session_id = ${checkoutSessionId}
    `) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`
      select * from orders where payment_intent_id = ${paymentIntentId}
    `) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByReference(reference: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`select * from orders where reference = ${reference}`) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async markInventoryCommitted(reference: string): Promise<void> {
    await this.sql`update orders set inventory_status = 'committed', inventory_committed_at = now(), updated_at = now() where reference = ${reference} and inventory_status = 'reserved'`;
  }

  async markInventoryReleased(reference: string): Promise<void> {
    await this.sql`update orders set inventory_status = 'released', inventory_released_at = now(), updated_at = now() where reference = ${reference} and inventory_status in ('pending', 'reserved')`;
  }

  async recordEvent(eventId: string, eventType: string, checkoutSessionId: string | undefined): Promise<void> {
    try {
      await this.sql`
        insert into stripe_events (event_id, event_type, checkout_session_id)
        values (${eventId}, ${eventType}, ${checkoutSessionId ?? null})
        on conflict (event_id) do nothing
      `;
    } catch (err) {
      console.error("Failed to record Stripe event audit row (non-fatal)", err);
    }
  }
}
