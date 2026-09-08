import "server-only";
import { neon } from "@neondatabase/serverless";
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
    // The HTTP driver returns jsonb columns already parsed, but guard against
    // a driver/config change that starts returning the raw text instead.
    lines: typeof row.lines === "string" ? JSON.parse(row.lines) : row.lines,
    notifiedAt: row.notified_at,
  };
}

/**
 * Postgres (Neon) implementation. Every state transition is a single guarded
 * UPDATE/INSERT statement — the WHERE clause encodes the precondition, so
 * concurrent or duplicate callers race safely at the database level instead
 * of relying on application-level locking.
 */
export class NeonOrderStore implements OrderStore {
  private sql: ReturnType<typeof neon>;

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("NeonOrderStore requires DATABASE_URL or POSTGRES_URL.");
    }
    this.sql = neon(connectionString);
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
        ${JSON.stringify(order.lines)}::jsonb
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
    `) as OrderRow[];
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
    const rows = (await this.sql`
      update orders set status = ${status}, updated_at = now()
      where checkout_session_id = ${checkoutSessionId} and status = 'pending'
      returning checkout_session_id
    `) as unknown[];
    return rows.length > 0;
  }

  async transitionPaidToRefunded(paymentIntentId: string): Promise<boolean> {
    const rows = (await this.sql`
      update orders set status = 'refunded', updated_at = now()
      where payment_intent_id = ${paymentIntentId} and status = 'paid'
      returning checkout_session_id
    `) as unknown[];
    return rows.length > 0;
  }

  async getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`
      select * from orders where checkout_session_id = ${checkoutSessionId}
    `) as OrderRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null> {
    const rows = (await this.sql`
      select * from orders where payment_intent_id = ${paymentIntentId}
    `) as OrderRow[];
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
