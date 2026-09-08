import "server-only";
import postgres from "postgres";
import type { NewOrderInput, OrderLine, OrderRecord, OrderStatus, OrderStore } from "./order-store.ts";

type OrderRow = {
  reference: string;
  checkout_session_id: string;
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
        customer_phone, delivery_method, delivery_address, order_notes, lines
      ) values (
        ${order.reference}, ${order.checkoutSessionId}, ${order.paymentIntentId}, 'pending',
        ${order.amountTotalCents}, ${order.currency}, ${order.customerEmail}, ${order.customerName},
        ${order.customerPhone}, ${order.deliveryMethod}, ${order.deliveryAddress}, ${order.notes},
        ${this.sql.json(order.lines)}
      )
      on conflict (checkout_session_id) do nothing
    `;
  }

  async claimFulfilment(checkoutSessionId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`
      update orders
      set status = 'paid', notify_claimed_at = now(), updated_at = now()
      where checkout_session_id = ${checkoutSessionId}
        and status = 'pending'
        and notify_claimed_at is null
      returning *
    `) as unknown as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
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
      set status = 'pending', notify_claimed_at = null, updated_at = now()
      where checkout_session_id = ${checkoutSessionId}
        and notified_at is null
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
      update orders set status = 'refunded', updated_at = now()
      where payment_intent_id = ${paymentIntentId} and status = 'paid'
      returning checkout_session_id
    `;
    return rows.length > 0;
  }

  async releaseStaleClaims(olderThanMinutes: number): Promise<number> {
    const rows = await this.sql`
      update orders
      set status = 'pending', notify_claimed_at = null, updated_at = now()
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
