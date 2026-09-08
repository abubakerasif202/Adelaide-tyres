/**
 * Durable order + webhook-idempotency contract. Two implementations exist:
 * - order-store-neon.ts: the real, production-safe implementation backed by
 *   Postgres, using guarded UPDATEs so concurrent/duplicate webhook delivery
 *   can never double-fulfil an order.
 * - order-store-memory.ts: a single-process in-memory implementation used
 *   only in tests and local dev without a database configured. It is NOT
 *   durable across serverless invocations and must never back a live
 *   checkout — see isPaymentConfigured() in payment.ts, which requires a
 *   real database connection string before enabling card payments at all.
 */

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export type OrderLine = {
  id: string;
  brand: string;
  pattern: string;
  size: string;
  quantity: number;
  price: number;
};

export type OrderRecord = {
  reference: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  status: OrderStatus;
  amountTotalCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: string;
  deliveryAddress: string;
  notes: string;
  lines: OrderLine[];
  notifiedAt: string | null;
};

export type NewOrderInput = Omit<OrderRecord, "status" | "notifiedAt">;

export interface OrderStore {
  /** Inserts the order row at Checkout Session creation time, status = "pending". */
  createPendingOrder(order: NewOrderInput): Promise<void>;

  /**
   * Atomically claims the right to notify the business for this order,
   * transitioning it to "paid" in the same statement. Returns the order row
   * iff this call performed the claim (status was "pending" and no claim was
   * already in flight); returns null if another delivery already claimed,
   * completed, or is currently attempting notification — the caller must do
   * nothing further in that case.
   */
  claimFulfilment(checkoutSessionId: string): Promise<OrderRecord | null>;

  /** Marks the order successfully notified. Call only after claimFulfilment succeeded and the notification was actually delivered. */
  markNotified(checkoutSessionId: string): Promise<void>;

  /** Releases a fulfilment claim without marking notified, so a later retry (Stripe redelivering the event) can attempt again. Call when notification delivery fails after claimFulfilment succeeded. */
  releaseFulfilmentClaim(checkoutSessionId: string): Promise<void>;

  /** Atomically transitions a still-pending order to a terminal non-paid status (failed/cancelled). No-ops if the order is no longer pending (e.g. already paid). */
  transitionPendingTo(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean>;

  /** Atomically transitions a paid order to refunded. No-ops if the order isn't currently paid. */
  transitionPaidToRefunded(paymentIntentId: string): Promise<boolean>;

  getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null>;
  getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null>;

  /** Best-effort audit log of every Stripe event seen. Must never throw — a logging failure must not block webhook processing. */
  recordEvent(eventId: string, eventType: string, checkoutSessionId: string | undefined): Promise<void>;
}

let cached: OrderStore | undefined;

/** True once a real (non-memory) order store is configured. */
export function hasDurableOrderStore(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export async function getOrderStore(): Promise<OrderStore> {
  if (cached) return cached;
  if (hasDurableOrderStore()) {
    const { NeonOrderStore } = await import("./order-store-neon.ts");
    cached = new NeonOrderStore();
  } else {
    const { MemoryOrderStore } = await import("./order-store-memory.ts");
    console.warn(
      "[order-store] No DATABASE_URL/POSTGRES_URL configured — using the non-durable in-memory order store. " +
        "This must never happen in production; isPaymentConfigured() should have kept card checkout disabled.",
    );
    cached = new MemoryOrderStore();
  }
  return cached;
}

/** Test-only: reset the cached singleton between test files. */
export function resetOrderStoreCache(): void {
  cached = undefined;
}
