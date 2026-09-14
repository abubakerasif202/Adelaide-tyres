import {
  retryDelaySeconds,
  WORK_LEASE_SECONDS,
  type InventoryWork,
  type NewOrderInput,
  type OrderRecord,
  type OrderStore,
  type PaymentConfirmation,
} from "./order-store.ts";

type OutboxRow = InventoryWork & {
  state: "pending" | "processing" | "completed" | "manual_review" | "cancelled";
  owner: string | null;
  leaseUntil: number;
  dueAt: number;
};

type NotificationLease = { owner: string; until: number };

export type AuditEntry = { orderReference: string; eventType: string; stripeEventId?: string; details?: Record<string, unknown> };

/**
 * Single-process, in-memory OrderStore. Used by tests and local dev without
 * a database configured — never durable across restarts or multiple
 * instances, and never selected while card checkout is enabled (see
 * isPaymentConfigured() in payment.ts).
 *
 * Each method below performs its check-then-mutate step with no `await` in
 * between, so it is atomic with respect to Node's single-threaded event
 * loop — the same property the Postgres implementation gets from a single
 * transaction with row locks.
 */
export class MemoryOrderStore implements OrderStore {
  private orders = new Map<string, OrderRecord>();
  private events = new Set<string>();
  private refunds = new Set<string>();
  private work = new Map<string, OutboxRow>();
  private notificationLeases = new Map<string, NotificationLease>();
  private notificationDue = new Map<string, number>();
  private notificationAttempts = new Map<string, number>();
  /** Test-visible mirror of order_inventory_audit. */
  readonly audit: AuditEntry[] = [];
  /** Test-visible view of the outbox. */
  readonly outbox: ReadonlyMap<string, Readonly<OutboxRow>> = this.work;
  /** Test clock: reassign to simulate time passing (leases, backoff). */
  now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async createPendingOrder(order: NewOrderInput): Promise<void> {
    const key = order.checkoutSessionId ?? order.reference;
    if (this.orders.has(key)) return;
    this.orders.set(key, {
      ...order,
      status: "pending",
      notifiedAt: null,
      inventoryReservationId: order.inventoryReservationId ?? null,
      inventoryStatus: order.inventoryStatus ?? "pending",
      inventoryCommitRequestId: order.inventoryCommitRequestId ?? null,
      inventoryReleaseRequestId: order.inventoryReleaseRequestId ?? null,
    });
  }

  private setByReference(reference: string, patch: Partial<OrderRecord>): void {
    for (const [key, order] of this.orders) {
      if (order.reference === reference) this.orders.set(key, { ...order, ...patch });
    }
  }

  async confirmPaymentAndEnqueue(input: PaymentConfirmation): Promise<OrderRecord> {
    const order = this.orders.get(input.checkoutSessionId);
    if (!order) throw new Error("ORDER_NOT_PERSISTED");
    if (this.events.has(input.stripeEventId)) return order;
    this.events.add(input.stripeEventId);

    const refunded = order.status === "refunded" || (input.paymentIntentId ? this.refunds.has(input.paymentIntentId) : false);
    const canCommit = Boolean(order.inventoryReservationId && order.inventoryCommitRequestId);
    const keeps = ["committed", "manual_review", "commit_pending"].includes(order.inventoryStatus);
    const holdGone = ["released", "release_pending", "failed"].includes(order.inventoryStatus);
    const inventoryStatus = keeps ? order.inventoryStatus : canCommit && !holdGone ? "commit_pending" : "manual_review";

    const updated: OrderRecord = {
      ...order,
      status: refunded ? "refunded" : "paid",
      paymentIntentId: input.paymentIntentId ?? order.paymentIntentId,
      inventoryStatus,
    };
    this.orders.set(input.checkoutSessionId, updated);

    // A release queued for this hold is superseded by the verified payment.
    for (const row of this.work.values()) {
      if (row.orderReference === order.reference && row.operation === "release" && (row.state === "pending" || row.state === "processing")) row.state = "cancelled";
    }
    if (inventoryStatus === "commit_pending" && order.inventoryReservationId && order.inventoryCommitRequestId && !this.work.has(order.inventoryCommitRequestId)) {
      this.work.set(order.inventoryCommitRequestId, {
        operationId: order.inventoryCommitRequestId, orderReference: order.reference, operation: "commit",
        reservationId: order.inventoryReservationId, requestId: order.inventoryCommitRequestId,
        attemptCount: 0, state: "pending", owner: null, leaseUntil: 0, dueAt: 0,
      });
    }
    this.audit.push({ orderReference: order.reference, eventType: "PAYMENT_CONFIRMED", stripeEventId: input.stripeEventId, details: { paymentIntentId: input.paymentIntentId } });
    return updated;
  }

  async cancelPendingOrder(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean> {
    const order = this.orders.get(checkoutSessionId);
    if (!order) return false;
    if (order.status === "pending") this.orders.set(checkoutSessionId, { ...order, status });
    else if (order.status !== status) return false; // paid/refunded/other terminal: never touched
    const current = this.orders.get(checkoutSessionId)!;
    if (!current.inventoryReservationId || !current.inventoryReleaseRequestId) return false;
    if (!["reserved", "release_pending"].includes(current.inventoryStatus)) return false;
    this.orders.set(checkoutSessionId, { ...current, inventoryStatus: "release_pending" });
    if (!this.work.has(current.inventoryReleaseRequestId)) {
      this.work.set(current.inventoryReleaseRequestId, {
        operationId: current.inventoryReleaseRequestId, orderReference: current.reference, operation: "release",
        reservationId: current.inventoryReservationId, requestId: current.inventoryReleaseRequestId,
        attemptCount: 0, state: "pending", owner: null, leaseUntil: 0, dueAt: 0,
      });
    }
    return true;
  }

  async claimInventoryWork(workerId: string, leaseSeconds = WORK_LEASE_SECONDS): Promise<InventoryWork | null> {
    const now = this.now();
    const row = [...this.work.values()]
      .filter((w) => (w.state === "pending" || (w.state === "processing" && w.leaseUntil <= now)) && w.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    if (!row) return null;
    row.state = "processing";
    row.owner = workerId;
    row.leaseUntil = now + leaseSeconds * 1000;
    row.attemptCount += 1;
    return { operationId: row.operationId, orderReference: row.orderReference, operation: row.operation, reservationId: row.reservationId, requestId: row.requestId, attemptCount: row.attemptCount };
  }

  private owned(operationId: string, workerId: string): OutboxRow | null {
    const row = this.work.get(operationId);
    if (!row || row.state !== "processing" || row.owner !== workerId) return null;
    return row;
  }

  async completeInventoryWork(operationId: string, workerId: string): Promise<void> {
    const row = this.owned(operationId, workerId);
    if (!row) return;
    row.state = "completed";
    row.owner = null;
    this.setByReference(row.orderReference, { inventoryStatus: row.operation === "commit" ? "committed" : "released" });
    this.audit.push({ orderReference: row.orderReference, eventType: row.operation === "commit" ? "INVENTORY_COMMITTED" : "INVENTORY_RELEASED" });
  }

  async retryInventoryWork(operationId: string, workerId: string, errorCode: string, manualReview = false): Promise<void> {
    const row = this.owned(operationId, workerId);
    if (!row) return;
    row.state = manualReview ? "manual_review" : "pending";
    row.owner = null;
    row.dueAt = this.now() + retryDelaySeconds(row.attemptCount) * 1000;
    if (row.operation === "commit") this.setByReference(row.orderReference, { inventoryStatus: manualReview ? "manual_review" : "commit_pending" });
    this.audit.push({ orderReference: row.orderReference, eventType: manualReview ? "INVENTORY_MANUAL_REVIEW" : "INVENTORY_RETRY_SCHEDULED", details: { errorCode, attemptCount: row.attemptCount } });
  }

  async claimNotification(workerId: string, leaseSeconds = WORK_LEASE_SECONDS): Promise<OrderRecord | null> {
    const now = this.now();
    for (const order of this.orders.values()) {
      const id = order.checkoutSessionId;
      if (!id || order.status !== "paid" || order.notifiedAt) continue;
      if (order.inventoryStatus !== "committed" && order.inventoryStatus !== "manual_review") continue;
      if ((this.notificationDue.get(id) ?? 0) > now) continue;
      const lease = this.notificationLeases.get(id);
      if (lease && lease.until > now) continue;
      this.notificationLeases.set(id, { owner: workerId, until: now + leaseSeconds * 1000 });
      this.notificationAttempts.set(id, (this.notificationAttempts.get(id) ?? 0) + 1);
      return order;
    }
    return null;
  }

  async finishNotification(checkoutSessionId: string, workerId: string, delivered: boolean): Promise<void> {
    const lease = this.notificationLeases.get(checkoutSessionId);
    if (!lease || lease.owner !== workerId || lease.until <= this.now()) return;
    const order = this.orders.get(checkoutSessionId);
    if (!order) return;
    this.notificationLeases.delete(checkoutSessionId);
    if (delivered) {
      this.orders.set(checkoutSessionId, { ...order, notifiedAt: new Date(this.now()).toISOString() });
    } else {
      this.notificationDue.set(checkoutSessionId, this.now() + retryDelaySeconds(this.notificationAttempts.get(checkoutSessionId) ?? 1) * 1000);
    }
    this.audit.push({ orderReference: order.reference, eventType: delivered ? "NOTIFICATION_DELIVERED" : "NOTIFICATION_RETRY_SCHEDULED" });
  }

  async recordRefund(paymentIntentId: string, eventId: string): Promise<void> {
    this.refunds.add(paymentIntentId);
    for (const [key, order] of this.orders) {
      if (order.paymentIntentId !== paymentIntentId) continue;
      if (order.status !== "refunded") this.audit.push({ orderReference: order.reference, eventType: "REFUND_CONFIRMED", stripeEventId: eventId });
      this.orders.set(key, { ...order, status: "refunded" });
    }
  }

  async recordPartialRefund(paymentIntentId: string, eventId: string, amounts: { amount: number | null; amountRefunded: number | null }): Promise<void> {
    for (const order of this.orders.values()) {
      if (order.paymentIntentId === paymentIntentId) this.audit.push({ orderReference: order.reference, eventType: "PARTIAL_REFUND_RECORDED", stripeEventId: eventId, details: { ...amounts } });
    }
  }

  async releaseStaleClaims(olderThanMinutes: number): Promise<number> {
    let released = 0;
    const cutoff = this.now() - olderThanMinutes * 60_000;
    for (const [id, lease] of this.notificationLeases) {
      if (lease.until - WORK_LEASE_SECONDS * 1000 < cutoff) { this.notificationLeases.delete(id); released += 1; }
    }
    return released;
  }

  async getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null> {
    return this.orders.get(checkoutSessionId) ?? null;
  }

  async getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) if (order.paymentIntentId === paymentIntentId) return order;
    return null;
  }

  async getByReference(reference: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) if (order.reference === reference) return order;
    return null;
  }

  async recordEvent(eventId: string): Promise<void> {
    this.events.add(eventId);
  }
}
