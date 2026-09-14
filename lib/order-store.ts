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

/** See docs/payment-inventory-reconciliation.md for the legal transitions. */
export type InventoryStatus =
  | "pending"
  | "reserved"
  | "failed"
  | "commit_pending"
  | "committed"
  | "release_pending"
  | "released"
  | "manual_review";

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
  inventoryStatus: InventoryStatus;
  inventoryCommitRequestId: string | null;
  inventoryReleaseRequestId: string | null;
};

/** One durable unit of 247 work, claimed under a lease by exactly one worker. */
export type InventoryWork = {
  operationId: string;
  orderReference: string;
  operation: "commit" | "release";
  reservationId: string;
  requestId: string;
  attemptCount: number;
};

export type PaymentConfirmation = {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  stripeEventId: string;
  stripeEventType: string;
};

export type NewOrderInput = Omit<OrderRecord, "status" | "notifiedAt" | "inventoryReservationId" | "inventoryStatus" | "inventoryCommitRequestId" | "inventoryReleaseRequestId"> & Partial<Pick<OrderRecord, "inventoryReservationId" | "inventoryStatus" | "inventoryCommitRequestId" | "inventoryReleaseRequestId">>;

/** Lease length shared by the inventory outbox and notification claims. */
export const WORK_LEASE_SECONDS = 60;
/** Attempts before a commit/release stops retrying and waits for an operator. */
export const MAX_INVENTORY_ATTEMPTS = 8;

/** Retry backoff in seconds: 15, 30, 60 … capped at one hour. */
export function retryDelaySeconds(attemptCount: number): number {
  return Math.min(3600, 15 * 2 ** Math.max(0, Math.min(attemptCount - 1, 8)));
}

export interface OrderStore {
  /** Inserts the order row at Checkout Session creation time, status = "pending". */
  createPendingOrder(order: NewOrderInput): Promise<void>;

  /**
   * Persists a verified successful payment atomically: the Stripe event id (the
   * idempotency gate — a duplicate returns the current row unchanged), the paid
   * status, the PaymentIntent id, the inventory transition to `commit_pending`
   * plus its outbox row, or `manual_review` when nothing can safely be
   * committed. A prior full-refund receipt lands the order as `refunded`.
   * Throws ORDER_NOT_PERSISTED when the session has no order row.
   */
  confirmPaymentAndEnqueue(input: PaymentConfirmation): Promise<OrderRecord>;

  /**
   * Terminal non-payment outcome: `pending` → failed/cancelled and the hold is
   * queued for release. Idempotent — duplicates and an already-cancelled order
   * whose release has not completed re-arm the same outbox row. A paid order is
   * never touched. Returns true when a release is queued.
   */
  cancelPendingOrder(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean>;

  claimInventoryWork(workerId: string, leaseSeconds?: number): Promise<InventoryWork | null>;
  /** Marks the work done and the order committed/released. Fenced on the worker's lease. */
  completeInventoryWork(operationId: string, workerId: string): Promise<void>;
  /** Re-queues with backoff, or parks in manual_review. Fenced on the worker's lease. */
  retryInventoryWork(operationId: string, workerId: string, errorCode: string, manualReview?: boolean): Promise<void>;

  /** Claims one paid order that is committed or in manual review and not yet notified. */
  claimNotification(workerId: string, leaseSeconds?: number): Promise<OrderRecord | null>;
  /** Records delivery or schedules a retry. Fenced on the worker's lease; never changes payment state. */
  finishNotification(checkoutSessionId: string, workerId: string, delivered: boolean): Promise<void>;

  /** Full refund: the order becomes `refunded` (never fulfilable/notifiable); inventory is untouched. */
  recordRefund(paymentIntentId: string, eventId: string): Promise<void>;
  /** Partial refund: durable audit only; the order stays paid and fulfilable. */
  recordPartialRefund(paymentIntentId: string, eventId: string, amounts: { amount: number | null; amountRefunded: number | null }): Promise<void>;

  /**
   * Operational sweep for notification leases that outlived their worker by far
   * longer than the lease (scripts/release-stale-claims.mjs). The lease already
   * self-heals after WORK_LEASE_SECONDS; this only exists for a manual nudge.
   */
  releaseStaleClaims(olderThanMinutes: number): Promise<number>;

  getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null>;
  getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null>;
  getByReference(reference: string): Promise<OrderRecord | null>;

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
