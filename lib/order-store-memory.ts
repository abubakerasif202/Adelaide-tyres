import type { InventoryWork, NewOrderInput, OrderRecord, OrderStore } from "./order-store.ts";

/**
 * Single-process, in-memory OrderStore. Used by tests and local dev without
 * a database configured — never durable across restarts or multiple
 * instances, and never selected while card checkout is enabled (see
 * isPaymentConfigured() in payment.ts).
 *
 * Each method below performs its check-then-mutate step with no `await` in
 * between, so it is atomic with respect to Node's single-threaded event
 * loop — the same property the Postgres implementation gets from a single
 * guarded UPDATE statement.
 */
export class MemoryOrderStore implements OrderStore {
  private refunds = new Set<string>();
  /** Audit trail mirror of order_inventory_audit for tests: [orderReference, eventType, stripeEventId]. */
  readonly audit: { orderReference: string; eventType: string; stripeEventId: string; details?: Record<string, unknown> }[] = [];
  async recordRefund(paymentIntentId: string, eventId: string): Promise<void> {
    this.refunds.add(paymentIntentId);
    for (const [key,order] of this.orders) if (order.paymentIntentId === paymentIntentId) {
      this.orders.set(key,{...order,status:'refunded'});
      this.audit.push({ orderReference: order.reference, eventType: 'REFUND_CONFIRMED', stripeEventId: eventId });
    }
  }
  async recordPartialRefund(paymentIntentId: string, eventId: string, amounts: { amount: number | null; amountRefunded: number | null }): Promise<void> {
    for (const order of this.orders.values()) if (order.paymentIntentId === paymentIntentId) {
      this.audit.push({ orderReference: order.reference, eventType: 'PARTIAL_REFUND_RECORDED', stripeEventId: eventId, details: { ...amounts } });
    }
  }
  private now: () => number;
  constructor(now: () => number = Date.now) { this.now = now; }
  private notificationDue = new Map<string,number>();
  private notificationLease = new Map<string,number>();
  private notificationOwners = new Map<string,string>();
  async claimNotification(workerId: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.status === 'paid' && order.inventoryStatus === 'committed' && order.checkoutSessionId && !order.notifiedAt && (this.notificationDue.get(order.checkoutSessionId) ?? 0) <= this.now() && (!this.notificationOwners.has(order.checkoutSessionId) || (this.notificationLease.get(order.checkoutSessionId) ?? 0) <= this.now())) {
        this.notificationOwners.set(order.checkoutSessionId,workerId);
        this.notificationLease.set(order.checkoutSessionId,this.now()+60_000);
        return order;
      }
    }
    return null;
  }
  async finishNotification(checkoutSessionId: string, workerId: string, delivered: boolean): Promise<void> {
    if (this.notificationOwners.get(checkoutSessionId) !== workerId || (this.notificationLease.get(checkoutSessionId) ?? 0) <= this.now()) return;
    if (delivered) await this.markNotified(checkoutSessionId);
    this.notificationOwners.delete(checkoutSessionId);
    this.notificationDue.set(checkoutSessionId,this.now()+30_000);
  }
  private orders = new Map<string, OrderRecord>();
  private events = new Set<string>();
  private notificationClaims = new Set<string>();
  private work = new Map<string, InventoryWork & { state: "pending" | "processing" | "completed" | "manual_review"; owner?: string; due?: number; lease?: number }>();

  async createPendingOrder(order: NewOrderInput): Promise<void> {
    const key = order.checkoutSessionId ?? order.reference;
    if (this.orders.has(key)) return;
    this.orders.set(key, { ...order, status: "pending", notifiedAt: null, inventoryReservationId: order.inventoryReservationId ?? null, inventoryStatus: order.inventoryStatus ?? "pending", inventoryCommitRequestId: order.inventoryCommitRequestId ?? null, inventoryReleaseRequestId: order.inventoryReleaseRequestId ?? null });
  }

  async claimFulfilment(checkoutSessionId: string): Promise<OrderRecord | null> {
    const order = this.orders.get(checkoutSessionId);
    if (!order) return null;
    if (order.status !== "paid" || order.inventoryStatus !== "committed" || order.notifiedAt || this.notificationClaims.has(checkoutSessionId)) return null;
    this.notificationClaims.add(checkoutSessionId);
    return order;
  }

  async confirmPaymentAndEnqueue(input: { checkoutSessionId: string; paymentIntentId: string | null; stripeEventId: string; stripeEventType: string }): Promise<OrderRecord | null> {
    const order = this.orders.get(input.checkoutSessionId);
    if (!order) throw new Error('ORDER_NOT_PERSISTED');
    if (this.events.has(input.stripeEventId)) return order;
    this.events.add(input.stripeEventId);
    const canCommit = Boolean(order.inventoryReservationId && order.inventoryCommitRequestId);
    const inventoryStatus = ["committed", "manual_review", "commit_pending"].includes(order.inventoryStatus) ? order.inventoryStatus : canCommit ? "commit_pending" : "manual_review";
    const updated: OrderRecord = { ...order, status: order.status === "refunded" || this.refunds.has(input.paymentIntentId ?? '') ? "refunded" : "paid", paymentIntentId: input.paymentIntentId ?? order.paymentIntentId, inventoryStatus };
    this.orders.set(input.checkoutSessionId, updated);
    if (updated.inventoryStatus !== "committed" && updated.inventoryReservationId && updated.inventoryCommitRequestId && !this.work.has(updated.inventoryCommitRequestId)) {
      this.work.set(updated.inventoryCommitRequestId, { operationId: updated.inventoryCommitRequestId, orderReference: updated.reference, operation: "commit", reservationId: updated.inventoryReservationId, requestId: updated.inventoryCommitRequestId, attemptCount: 0, state: "pending" });
    }
    return updated;
  }

  async claimInventoryWork(workerId: string, leaseSeconds = 60): Promise<InventoryWork | null> {
    const item = [...this.work.values()].find((work) => (work.state === "pending" || (work.state === "processing" && (work.lease ?? 0) <= this.now())) && (work.due ?? 0) <= this.now());
    if (!item) return null;
    item.state = "processing"; item.owner = workerId; item.attemptCount += 1;
    item.lease = this.now()+leaseSeconds*1000;
    return { ...item };
  }

  async completeInventoryWork(operationId: string, workerId: string): Promise<void> {
    const item = this.work.get(operationId);
    if (!item || item.state !== "processing" || item.owner !== workerId) return;
    item.state = "completed";
    for (const [key, order] of this.orders) if (order.reference === item.orderReference) this.orders.set(key, { ...order, inventoryStatus: "committed" });
  }

  async retryInventoryWork(operationId: string, workerId: string, _errorCode: string, manualReview = false): Promise<void> {
    const item = this.work.get(operationId);
    if (!item || item.state !== "processing" || item.owner !== workerId) return;
    item.state = manualReview ? "manual_review" : "pending"; item.owner = undefined;
    item.due = this.now()+Math.min(3600,15*2**Math.min(item.attemptCount-1,8))*1000;
    for (const [key, order] of this.orders) if (order.reference === item.orderReference) this.orders.set(key, { ...order, inventoryStatus: manualReview ? "manual_review" : "commit_pending" });
  }

  async markNotified(checkoutSessionId: string): Promise<void> {
    const order = this.orders.get(checkoutSessionId);
    if (!order) return;
    this.orders.set(checkoutSessionId, { ...order, notifiedAt: new Date().toISOString() });
  }

  async releaseFulfilmentClaim(checkoutSessionId: string): Promise<void> {
    const order = this.orders.get(checkoutSessionId);
    if (!order || order.notifiedAt) return;
    this.notificationClaims.delete(checkoutSessionId);
  }

  async transitionPendingTo(checkoutSessionId: string, status: "failed" | "cancelled"): Promise<boolean> {
    const order = this.orders.get(checkoutSessionId);
    if (!order || order.status !== "pending") return false;
    this.orders.set(checkoutSessionId, { ...order, status });
    return true;
  }

  async transitionPaidToRefunded(paymentIntentId: string): Promise<boolean> {
    for (const [key, order] of this.orders) {
      if (order.paymentIntentId === paymentIntentId && order.status === "paid") {
        this.orders.set(key, { ...order, status: "refunded" });
        return true;
      }
    }
    return false;
  }

  /**
   * No-op: this store is single-process and never survives the crash that
   * releaseStaleClaims exists to recover from (see order-store.ts), so
   * there's nothing to reconcile here.
   */
  async releaseStaleClaims(): Promise<number> {
    return 0;
  }

  async getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderRecord | null> {
    return this.orders.get(checkoutSessionId) ?? null;
  }

  async getByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.paymentIntentId === paymentIntentId) return order;
    }
    return null;
  }

  async getByReference(reference: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) if (order.reference === reference) return order;
    return null;
  }

  async markInventoryCommitted(reference: string): Promise<void> {
    for (const [key, order] of this.orders) if (order.reference === reference && order.inventoryStatus === "reserved") this.orders.set(key, { ...order, inventoryStatus: "committed" });
  }

  async markInventoryReleased(reference: string): Promise<void> {
    for (const [key, order] of this.orders) if (order.reference === reference && (order.inventoryStatus === "pending" || order.inventoryStatus === "reserved")) this.orders.set(key, { ...order, inventoryStatus: "released" });
  }

  async recordEvent(eventId: string): Promise<void> {
    this.events.add(eventId);
  }
}
