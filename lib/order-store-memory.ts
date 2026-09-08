import type { NewOrderInput, OrderRecord, OrderStore } from "./order-store.ts";

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
  private orders = new Map<string, OrderRecord>();
  private events = new Set<string>();

  async createPendingOrder(order: NewOrderInput): Promise<void> {
    if (this.orders.has(order.checkoutSessionId)) return;
    this.orders.set(order.checkoutSessionId, { ...order, status: "pending", notifiedAt: null });
  }

  async claimFulfilment(checkoutSessionId: string): Promise<OrderRecord | null> {
    const order = this.orders.get(checkoutSessionId);
    if (!order) return null;
    if (order.status !== "pending") return null;
    const claimed: OrderRecord = { ...order, status: "paid" };
    this.orders.set(checkoutSessionId, claimed);
    return claimed;
  }

  async markNotified(checkoutSessionId: string): Promise<void> {
    const order = this.orders.get(checkoutSessionId);
    if (!order) return;
    this.orders.set(checkoutSessionId, { ...order, notifiedAt: new Date().toISOString() });
  }

  async releaseFulfilmentClaim(checkoutSessionId: string): Promise<void> {
    const order = this.orders.get(checkoutSessionId);
    if (!order || order.notifiedAt) return;
    this.orders.set(checkoutSessionId, { ...order, status: "pending" });
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

  async recordEvent(eventId: string): Promise<void> {
    this.events.add(eventId);
  }
}
