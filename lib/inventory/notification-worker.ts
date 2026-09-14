import 'server-only';
import { randomUUID } from 'node:crypto';
import type { OrderStore } from '../order-store.ts';
import { sendNotification } from '../notify.ts';

export async function processOrderNotifications(store: OrderStore, notify = sendNotification, limit = 25) {
  let delivered = 0;
  let failed = 0;
  for (let index = 0; index < limit; index += 1) {
    const owner = randomUUID();
    const order = await store.claimNotification(owner);
    if (!order?.checkoutSessionId) break;
    let sent = false;
    try {
      sent = (await notify({
        idempotencyKey: `paid-order/${order.reference}`,
        subject: `PAID order ${order.reference} · ${(order.amountTotalCents / 100).toFixed(2)} ${order.currency.toUpperCase()}`,
        replyTo: order.customerEmail,
        text: [
          `Reference: ${order.reference} (Stripe Checkout — PAID)`,
          `Contact: ${order.customerName} · ${order.customerPhone} · ${order.customerEmail}`,
          `Fulfilment: ${order.deliveryMethod}`,
          `Address: ${order.deliveryAddress}`,
          ...order.lines.map((line) => `${line.quantity} × ${line.brand} ${line.pattern} ${line.size} @ $${line.price}`),
          `Amount paid: $${(order.amountTotalCents / 100).toFixed(2)} ${order.currency.toUpperCase()}`,
          order.notes,
        ].filter(Boolean).join('\n'),
      })).delivered;
    } catch {
      // The durable claim is released for retry; never change payment state.
      sent = false;
    }
    await store.finishNotification(order.checkoutSessionId, owner, sent);
    if (sent) delivered += 1; else { failed += 1; break; }
  }
  return { delivered, failed };
}
