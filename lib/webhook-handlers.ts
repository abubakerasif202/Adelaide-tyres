import type Stripe from "stripe";
import type { OrderStore } from "./order-store.ts";
import { sendNotification } from "./notify.ts";
import { order as orderConfig } from "./config.ts";

export type NotifyFn = typeof sendNotification;

export type WebhookDeps = {
  store: OrderStore;
  notify: NotifyFn;
};

/**
 * Processes one verified Stripe event. Signature verification happens in the
 * route handler (it needs the raw body); everything from here on operates on
 * the already-authenticated `event` object, which makes this function fully
 * unit-testable without a network call to Stripe.
 *
 * Throws on a recoverable failure (e.g. notification delivery failed) so the
 * caller can return a non-2xx response and let Stripe redeliver the event
 * later. Every state transition below is guarded at the OrderStore level, so
 * a redelivery — of this event or a different one for the same session — can
 * never double-fulfil.
 */
export async function processStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<void> {
  const { store } = deps;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      await store.recordEvent(event.id, event.type, session.id);
      await handlePaymentSucceeded(session, deps);
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await store.recordEvent(event.id, event.type, session.id);
      await store.transitionPendingTo(session.id, "failed");
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await store.recordEvent(event.id, event.type, session.id);
      await store.transitionPendingTo(session.id, "cancelled");
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      await store.recordEvent(event.id, event.type, undefined);
      if (paymentIntentId) await store.transitionPaidToRefunded(paymentIntentId);
      return;
    }
    default:
      // Not an event this app fulfils orders from. Still worth a lightweight
      // audit trail for support/reconciliation.
      await store.recordEvent(event.id, event.type, undefined);
      return;
  }
}

async function handlePaymentSucceeded(session: Stripe.Checkout.Session, deps: WebhookDeps): Promise<void> {
  if (session.payment_status !== "paid") return;

  const claimed = await deps.store.claimFulfilment(session.id);
  if (!claimed) {
    // Already notified, already claimed by a concurrent delivery, or the
    // order doesn't exist (shouldn't happen — createPendingOrder runs at
    // Checkout Session creation time). Either way, nothing more to do here.
    return;
  }

  try {
    const { delivered } = await deps.notify({
      subject: `PAID order ${claimed.reference} · ${(claimed.amountTotalCents / 100).toFixed(2)} ${claimed.currency.toUpperCase()}`,
      replyTo: claimed.customerEmail,
      text: [
        `Reference: ${claimed.reference} (Stripe Checkout — PAID)`,
        `Payment intent: ${claimed.paymentIntentId ?? "unknown"}`,
        `Contact: ${claimed.customerName} · ${claimed.customerPhone} · ${claimed.customerEmail}`,
        `Fulfilment: ${claimed.deliveryMethod}`,
        claimed.deliveryMethod === "delivery" ? `Address: ${claimed.deliveryAddress}` : `Pickup: ${orderConfig.pickup.address}`,
        "",
        ...claimed.lines.map((l) => `  ${l.quantity} × ${l.brand} ${l.pattern} ${l.size} @ $${l.price}`),
        "",
        `Amount paid: $${(claimed.amountTotalCents / 100).toFixed(2)} ${claimed.currency.toUpperCase()}`,
        claimed.notes ? `Notes: ${claimed.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (!delivered) throw new Error("Notification transport unavailable.");
    await deps.store.markNotified(session.id);
  } catch (err) {
    // Release the claim so the next redelivery of this (or an equivalent)
    // event can retry — we must never silently drop a paid order because an
    // email failed to send.
    await deps.store.releaseFulfilmentClaim(session.id);
    throw err;
  }
}

export const defaultNotify = sendNotification;
