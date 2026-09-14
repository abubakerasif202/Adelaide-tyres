import "server-only";
import postgres from "postgres";
import {
  WORK_LEASE_SECONDS,
  type InventoryStatus,
  type InventoryWork,
  type NewOrderInput,
  type OrderLine,
  type OrderRecord,
  type OrderStatus,
  type OrderStore,
  type PaymentConfirmation,
} from "./order-store.ts";

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
  inventory_status: InventoryStatus;
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

type Sql = ReturnType<typeof postgres>;

// Retry backoff (seconds) for both outbox and notification attempts:
// 15 · 2^(attempts−1), capped at one hour. Mirrors retryDelaySeconds().

/**
 * Postgres implementation (any standard Postgres provider — currently
 * Supabase). Every state transition is either a single guarded UPDATE or a
 * short transaction with row locks — the WHERE clause encodes the
 * precondition, so concurrent or duplicate callers race safely at the
 * database level instead of relying on application-level locking.
 *
 * Uses postgres.js over the standard Postgres wire protocol (not a
 * provider-specific HTTP driver), so this works against any Postgres,
 * pooled or direct. `prepare: false` is required for Supabase's transaction
 * pooler (pgbouncer in transaction mode doesn't support prepared
 * statements) and is harmless against a direct connection.
 */
export class PostgresOrderStore implements OrderStore {
  private sql: Sql;

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
        ${this.sql.json(order.lines)}, ${order.inventoryReservationId ?? null}, ${order.inventoryStatus ?? "pending"},
        ${order.inventoryCommitRequestId ?? null}, ${order.inventoryReleaseRequestId ?? null}
      )
      on conflict (reference) do nothing
    `;
  }

  async confirmPaymentAndEnqueue(input: PaymentConfirmation): Promise<OrderRecord> {
    return this.sql.begin(async (tx) => {
      // Serialise every delivery for the same payment; row lock below covers
      // deliveries that carry no PaymentIntent id.
      if (input.paymentIntentId) await tx`select pg_advisory_xact_lock(hashtextextended(${input.paymentIntentId}, 0))`;
      const inserted = await tx`
        insert into stripe_events (event_id, event_type, checkout_session_id)
        values (${input.stripeEventId}, ${input.stripeEventType}, ${input.checkoutSessionId})
        on conflict (event_id) do nothing returning event_id
      `;
      const rows = (await tx`select * from orders where checkout_session_id = ${input.checkoutSessionId} for update`) as unknown as OrderRow[];
      const current = rows[0];
      if (!current) throw new Error("ORDER_NOT_PERSISTED");
      if (inserted.length === 0) return fromRow(current);

      const receipts = input.paymentIntentId
        ? await tx`select 1 from order_refund_receipts where payment_intent_id = ${input.paymentIntentId}`
        : [];
      const nextStatus: OrderStatus = current.status === "refunded" || receipts.length > 0 ? "refunded" : "paid";
      const keeps = ["committed", "manual_review", "commit_pending"].includes(current.inventory_status);
      const holdGone = ["released", "release_pending", "failed"].includes(current.inventory_status);
      const canCommit = Boolean(current.inventory_reservation_id && current.inventory_commit_request_id) && !holdGone;
      const inventoryStatus: InventoryStatus = keeps ? current.inventory_status : canCommit ? "commit_pending" : "manual_review";

      const updated = (await tx`
        update orders
        set status = ${nextStatus},
            payment_intent_id = coalesce(payment_intent_id, ${input.paymentIntentId}),
            inventory_status = ${inventoryStatus},
            updated_at = now()
        where reference = ${current.reference}
        returning *
      `) as unknown as OrderRow[];
      // A queued release for this hold is superseded by the verified payment.
      await tx`
        update inventory_outbox set state = 'cancelled', lease_owner = null, lease_expires_at = null, updated_at = now()
        where order_reference = ${current.reference} and operation = 'release' and state in ('pending', 'processing')
      `;
      if (inventoryStatus === "commit_pending" && current.inventory_reservation_id && current.inventory_commit_request_id) {
        await tx`
          insert into inventory_outbox (operation_id, order_reference, operation, reservation_id, request_id)
          values (${current.inventory_commit_request_id}, ${current.reference}, 'commit', ${current.inventory_reservation_id}, ${current.inventory_commit_request_id})
          on conflict (order_reference, operation) do nothing
        `;
      }
      await tx`
        insert into order_inventory_audit (order_reference, event_type, stripe_event_id, operation_id, details)
        values (${current.reference}, 'PAYMENT_CONFIRMED', ${input.stripeEventId}, ${current.inventory_commit_request_id}, ${tx.json({ paymentIntentId: input.paymentIntentId, inventoryStatus })})
      `;
      return fromRow(updated[0]);
    });
  }

  async cancelPendingOrder(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean> {
    return this.sql.begin(async (tx) => {
      const rows = (await tx`select * from orders where checkout_session_id = ${checkoutSessionId} for update`) as unknown as OrderRow[];
      const current = rows[0];
      if (!current) return false;
      if (current.status === "pending") {
        await tx`update orders set status = ${status}, updated_at = now() where reference = ${current.reference}`;
      } else if (current.status !== status) {
        return false; // paid / refunded / a different terminal state: never touched
      }
      if (!current.inventory_reservation_id || !current.inventory_release_request_id) return false;
      if (!["reserved", "release_pending"].includes(current.inventory_status)) return false;
      await tx`update orders set inventory_status = 'release_pending', updated_at = now() where reference = ${current.reference}`;
      await tx`
        insert into inventory_outbox (operation_id, order_reference, operation, reservation_id, request_id)
        values (${current.inventory_release_request_id}, ${current.reference}, 'release', ${current.inventory_reservation_id}, ${current.inventory_release_request_id})
        on conflict (order_reference, operation) do nothing
      `;
      return true;
    });
  }

  async claimInventoryWork(workerId: string, leaseSeconds = WORK_LEASE_SECONDS): Promise<InventoryWork | null> {
    const rows = await this.sql`
      with candidate as (
        select operation_id from inventory_outbox
        where (state = 'pending' or (state = 'processing' and lease_expires_at <= now()))
          and next_attempt_at <= now()
        order by next_attempt_at, created_at, operation_id
        for update skip locked limit 1
      )
      update inventory_outbox o
      set state = 'processing', lease_owner = ${workerId},
          lease_expires_at = now() + make_interval(secs => ${leaseSeconds}),
          attempt_count = o.attempt_count + 1, last_attempt_at = now(), updated_at = now()
      from candidate where o.operation_id = candidate.operation_id
      returning o.operation_id, o.order_reference, o.operation, o.reservation_id, o.request_id, o.attempt_count
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      operationId: String(row.operation_id),
      orderReference: String(row.order_reference),
      operation: row.operation as "commit" | "release",
      reservationId: String(row.reservation_id),
      requestId: String(row.request_id),
      attemptCount: Number(row.attempt_count),
    };
  }

  async completeInventoryWork(operationId: string, workerId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      const rows = await tx`
        update inventory_outbox
        set state = 'completed', completed_at = now(), lease_owner = null, lease_expires_at = null, last_error_code = null, updated_at = now()
        where operation_id = ${operationId} and state = 'processing' and lease_owner = ${workerId}
        returning order_reference, operation
      `;
      const done = rows[0];
      if (!done) return;
      if (done.operation === "commit") {
        await tx`
          update orders set inventory_status = 'committed', inventory_committed_at = now(),
            fulfilment_ready_at = case when status = 'paid' then now() else fulfilment_ready_at end, updated_at = now()
          where reference = ${done.order_reference}
        `;
      } else {
        await tx`
          update orders set inventory_status = 'released', inventory_released_at = now(), updated_at = now()
          where reference = ${done.order_reference} and inventory_status <> 'committed'
        `;
      }
      await tx`
        insert into order_inventory_audit (order_reference, event_type, operation_id)
        values (${done.order_reference}, ${done.operation === "commit" ? "INVENTORY_COMMITTED" : "INVENTORY_RELEASED"}, ${operationId})
      `;
    });
  }

  async retryInventoryWork(operationId: string, workerId: string, errorCode: string, manualReview = false): Promise<void> {
    const code = errorCode.slice(0, 80);
    await this.sql.begin(async (tx) => {
      const rows = await tx`
        update inventory_outbox
        set state = ${manualReview ? "manual_review" : "pending"}, lease_owner = null, lease_expires_at = null,
            last_error_code = ${code},
            next_attempt_at = now() + make_interval(secs => least(3600, 15 * power(2, least(greatest(attempt_count - 1, 0), 8))::int)),
            updated_at = now()
        where operation_id = ${operationId} and state = 'processing' and lease_owner = ${workerId}
        returning order_reference, operation, attempt_count
      `;
      const row = rows[0];
      if (!row) return;
      if (row.operation === "commit") {
        await tx`
          update orders set inventory_status = ${manualReview ? "manual_review" : "commit_pending"}, fulfilment_ready_at = null, updated_at = now()
          where reference = ${row.order_reference} and inventory_status <> 'committed'
        `;
      }
      await tx`
        insert into order_inventory_audit (order_reference, event_type, operation_id, details)
        values (${row.order_reference}, ${manualReview ? "INVENTORY_MANUAL_REVIEW" : "INVENTORY_RETRY_SCHEDULED"}, ${operationId}, ${tx.json({ errorCode: code, attemptCount: Number(row.attempt_count), operation: row.operation })})
      `;
    });
  }

  async claimNotification(workerId: string, leaseSeconds = WORK_LEASE_SECONDS): Promise<OrderRecord | null> {
    return this.sql.begin(async (tx) => {
      const rows = (await tx`
        with candidate as (
          select id from orders
          where status = 'paid'
            and inventory_status in ('committed', 'manual_review')
            and checkout_session_id is not null
            and notified_at is null
            and notification_next_attempt_at <= now()
            and (notify_claimed_at is null or notify_claimed_at < now() - make_interval(secs => ${leaseSeconds}))
          order by notification_next_attempt_at, id
          for update skip locked limit 1
        )
        update orders o
        set notify_claimed_at = now(), notification_owner = ${workerId}, notification_attempts = notification_attempts + 1
        from candidate where o.id = candidate.id
        returning o.*
      `) as unknown as OrderRow[];
      if (!rows[0]) return null;
      await tx`insert into order_inventory_audit (order_reference, event_type) values (${rows[0].reference}, 'NOTIFICATION_CLAIMED')`;
      return fromRow(rows[0]);
    });
  }

  async finishNotification(checkoutSessionId: string, workerId: string, delivered: boolean): Promise<void> {
    await this.sql.begin(async (tx) => {
      const rows = await tx`
        update orders
        set notified_at = case when ${delivered} then now() else notified_at end,
            notify_claimed_at = null, notification_owner = null,
            notification_next_attempt_at = now() + make_interval(secs => least(3600, 15 * power(2, least(greatest(notification_attempts - 1, 0), 8))::int)),
            updated_at = now()
        where checkout_session_id = ${checkoutSessionId}
          and notification_owner = ${workerId}
          and notify_claimed_at > now() - make_interval(secs => ${WORK_LEASE_SECONDS})
        returning reference
      `;
      if (rows[0]) {
        await tx`
          insert into order_inventory_audit (order_reference, event_type)
          values (${rows[0].reference}, ${delivered ? "NOTIFICATION_DELIVERED" : "NOTIFICATION_RETRY_SCHEDULED"})
        `;
      }
    });
  }

  async recordRefund(paymentIntentId: string, eventId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${paymentIntentId}, 0))`;
      await tx`
        insert into order_refund_receipts (payment_intent_id, stripe_event_id)
        values (${paymentIntentId}, ${eventId}) on conflict do nothing
      `;
      const rows = await tx`
        update orders set status = 'refunded', fulfilment_ready_at = null, updated_at = now()
        where payment_intent_id = ${paymentIntentId} and status <> 'refunded'
        returning reference
      `;
      for (const row of rows) {
        await tx`insert into order_inventory_audit (order_reference, event_type, stripe_event_id) values (${row.reference}, 'REFUND_CONFIRMED', ${eventId})`;
      }
    });
  }

  async recordPartialRefund(paymentIntentId: string, eventId: string, amounts: { amount: number | null; amountRefunded: number | null }): Promise<void> {
    await this.sql`
      insert into order_inventory_audit (order_reference, event_type, stripe_event_id, details)
      select reference, 'PARTIAL_REFUND_RECORDED', ${eventId}, ${this.sql.json({ amount: amounts.amount, amountRefunded: amounts.amountRefunded })}
      from orders where payment_intent_id = ${paymentIntentId}
    `;
  }

  async releaseStaleClaims(olderThanMinutes: number): Promise<number> {
    const rows = await this.sql`
      update orders
      set notify_claimed_at = null, notification_owner = null, updated_at = now()
      where status = 'paid'
        and notified_at is null
        and notify_claimed_at is not null
        and notify_claimed_at < now() - make_interval(mins => ${olderThanMinutes})
      returning checkout_session_id
    `;
    return rows.length;
  }

  async getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`select * from orders where checkout_session_id = ${checkoutSessionId}`) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`select * from orders where payment_intent_id = ${paymentIntentId}`) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByReference(reference: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`select * from orders where reference = ${reference}`) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
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
