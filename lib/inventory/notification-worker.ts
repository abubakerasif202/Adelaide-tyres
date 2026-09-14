import "server-only";
import { randomUUID } from "node:crypto";
import type { OrderRecord, OrderStore } from "../order-store.ts";
import { sendNotification } from "../notify.ts";
import { order as orderConfig } from "../config.ts";
import { errorCodeOf, logInventoryEvent } from "./log.ts";

export type NotifyFn = typeof sendNotification;

export type NotificationRunSummary = { delivered: number; failed: number };

/** The staff email for a paid order. Exported so tests can assert on wording. */
export function paidOrderNotification(order: OrderRecord) {
  const amount = `${(order.amountTotalCents / 100).toFixed(2)} ${order.currency.toUpperCase()}`;
  const needsReview = order.inventoryStatus === "manual_review";
  return {
    idempotencyKey: `paid-order/${order.reference}`,
    subject: needsReview
      ? `PAID order ${order.reference} · NEEDS REVIEW — stock not confirmed · ${amount}`
      : `PAID order ${order.reference} · ${amount}`,
    replyTo: order.customerEmail,
    text: [
      `Reference: ${order.reference} (Stripe Checkout — PAID)`,
      needsReview
        ? "ACTION REQUIRED: 247 could not confirm the stock hold for this order. Reacquire stock in 247 or refund the customer before dispatch."
        : "",
      `Payment intent: ${order.paymentIntentId ?? "unknown"}`,
      `Contact: ${order.customerName} · ${order.customerPhone} · ${order.customerEmail}`,
      `Fulfilment: ${order.deliveryMethod}`,
      order.deliveryMethod === "delivery" ? `Address: ${order.deliveryAddress}` : `Pickup: ${orderConfig.pickup.address}`,
      "",
      ...order.lines.map((line) => `  ${line.quantity} × ${line.brand} ${line.pattern} ${line.size} @ $${line.price}`),
      "",
      `Amount paid: $${amount}`,
      order.notes ? `Notes: ${order.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * Tells the business about paid orders once their inventory outcome is known
 * (committed, or parked for manual review). Claims are leased and fenced, and
 * a failed send only schedules a retry — payment and inventory state are never
 * touched from here. Never throws.
 */
export async function processOrderNotifications(store: OrderStore, notify: NotifyFn = sendNotification, limit = 25): Promise<NotificationRunSummary> {
  const summary: NotificationRunSummary = { delivered: 0, failed: 0 };
  for (let index = 0; index < limit; index += 1) {
    const owner = randomUUID();
    const order = await store.claimNotification(owner);
    if (!order?.checkoutSessionId) break;
    let sent = false;
    try {
      sent = (await notify(paidOrderNotification(order))).delivered;
    } catch (error) {
      logInventoryEvent("warn", "notification.send.failed", { orderReference: order.reference, errorCode: errorCodeOf(error) });
      sent = false;
    }
    await store.finishNotification(order.checkoutSessionId, owner, sent);
    if (sent) {
      summary.delivered += 1;
    } else {
      // The transport is down for everyone; stop hammering it this run.
      summary.failed += 1;
      break;
    }
  }
  return summary;
}
