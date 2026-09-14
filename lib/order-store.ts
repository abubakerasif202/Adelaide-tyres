/**
 * Durable order + webhook-idempotency contract. Two implementations exist:
 * - order-store-postgres.ts: the real, production-safe implementation backed
 *   by Postgres, using guarded UPDATEs so concurrent/duplicate webhook delivery
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
  checkoutSessionId: string | null;
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
  inventoryReservationId: string | null;
  inventoryStatus: "pending" | "reserved" | "failed" | "commit_pending" | "committed" | "release_pending" | "released" | "manual_review";
  inventoryCommitRequestId: string | null;
  inventoryReleaseRequestId: string | null;
};

export type InventoryWork = {
  operationId: string;
  orderReference: string;
  operation: "commit" | "release";
  reservationId: string;
  requestId: string;
  attemptCount: number;
};

export type NewOrderInput = Omit<OrderRecord, "status" | "notifiedAt" | "inventoryReservationId" | "inventoryStatus" | "inventoryCommitRequestId" | "inventoryReleaseRequestId"> & Partial<Pick<OrderRecord, "inventoryReservationId" | "inventoryStatus" | "inventoryCommitRequestId" | "inventoryReleaseRequestId">>;

export interface OrderStore {
  /** Full refund: the order becomes `refunded` (never fulfilable/notifiable); inventory is untouched. */
  recordRefund(paymentIntentId: string, eventId: string): Promise<void>;
  /** Partial refund: durable audit only; the order stays paid and fulfilable. */
  recordPartialRefund(paymentIntentId: string, eventId: string, amounts: { amount: number | null; amountRefunded: number | null }): Promise<void>;
  claimNotification(workerId: string): Promise<OrderRecord | null>;
  finishNotification(checkoutSessionId: string, workerId: string, delivered: boolean): Promise<void>;
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

  /** Atomically persists the verified payment event, paid state, and commit outbox row. */
  confirmPaymentAndEnqueue(input: {
    checkoutSessionId: string;
    paymentIntentId: string | null;
    stripeEventId: string;
    stripeEventType: string;
  }): Promise<OrderRecord | null>;

  claimInventoryWork(workerId: string, leaseSeconds?: number): Promise<InventoryWork | null>;
  completeInventoryWork(operationId: string, workerId: string): Promise<void>;
  retryInventoryWork(operationId: string, workerId: string, errorCode: string, manualReview?: boolean): Promise<void>;

  /** Marks the order successfully notified. Call only after claimFulfilment succeeded and the notification was actually delivered. */
  markNotified(checkoutSessionId: string): Promise<void>;

  /** Releases a fulfilment claim without marking notified, so a later retry (Stripe redelivering the event) can attempt again. Call when notification delivery fails after claimFulfilment succeeded. */
  releaseFulfilmentClaim(checkoutSessionId: string): Promise<void>;

  /** Atomically transitions a still-pending order to a terminal non-paid status (failed/cancelled). No-ops if the order is no longer pending (e.g. already paid). */
  transitionPendingTo(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean>;

  /** Atomically transitions a paid order to refunded. No-ops if the order isn't currently paid. */
  transitionPaidToRefunded(paymentIntentId: string): Promise<boolean>;

  /**
   * Recovery path for a claim that never resolved: if the process handling
   * claimFulfilment is killed (OOM, deploy restart) between the claim and the
   * notify/release step, the order is stuck at status "paid" with no
   * notification sent and no further webhook redelivery able to re-claim it
   * (claimFulfilment requires status "pending"). This releases any claim
   * older than olderThanMinutes back to "pending" so the next redelivered or
   * manually-replayed event can retry it. Intended to run from
   * scripts/release-stale-claims.mjs on a schedule (cron) or on demand.
   * Returns the number of orders released.
   */
  releaseStaleClaims(olderThanMinutes: number): Promise<number>;

  getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null>;
  getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null>;
  getByReference(reference: string): Promise<OrderRecord | null>;
  markInventoryCommitted(reference: string): Promise<void>;
  markInventoryReleased(reference: string): Promise<void>;

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
    const { PostgresOrderStore } = await import("./order-store-postgres.ts");
    cached = new PostgresOrderStore();
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
