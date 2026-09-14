import type Stripe from "stripe";
import type { OrderStore } from "./order-store.ts";
import { sendNotification } from "./notify.ts";
import { commitInventory, releaseInventory } from "./inventory/client.ts";
import { errorCodeOf, logInventoryEvent } from "./inventory/log.ts";
import { processInventoryOutbox } from "./inventory/outbox-worker.ts";
import { processOrderNotifications } from "./inventory/notification-worker.ts";

export type NotifyFn = typeof sendNotification;

export type WebhookDeps = {
  store: OrderStore;
  notify: NotifyFn;
  /** Injectable only for deterministic webhook tests; production uses 247. */
  commitInventory?: typeof commitInventory;
  releaseInventory?: typeof releaseInventory;
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
      await handlePaymentSucceeded(session, event.id, event.type, deps);
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await store.recordEvent(event.id, event.type, session.id);
      if (await store.transitionPendingTo(session.id, "failed")) await releaseOrderReservation(session.id, deps);
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await store.recordEvent(event.id, event.type, session.id);
      if (await store.transitionPendingTo(session.id, "cancelled")) await releaseOrderReservation(session.id, deps);
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      await store.recordEvent(event.id, event.type, undefined);
      if (!paymentIntentId) return;
      // Refund rules: a FULL refund closes the order (refunded, not
      // fulfilable/notifiable); a PARTIAL refund (delivery fee, price
      // adjustment) leaves a paid, fulfilable order. Neither ever restocks:
      // a physical return is a normal 247 stock-in.
      if (isFullRefund(charge)) {
        await store.recordRefund(paymentIntentId, event.id);
      } else {
        await store.recordPartialRefund(paymentIntentId, event.id, {
          amount: Number.isFinite(charge.amount) ? charge.amount : null,
          amountRefunded: Number.isFinite(charge.amount_refunded) ? charge.amount_refunded : null,
        });
        logInventoryEvent("info", "stripe.refund.partial", { stripeEventId: event.id, stripeEventType: event.type });
      }
      return;
    }
    default:
      // Not an event this app fulfils orders from. Still worth a lightweight
      // audit trail for support/reconciliation.
      await store.recordEvent(event.id, event.type, undefined);
      return;
  }
}

/**
 * Stripe emits `charge.refunded` for partial refunds as well; `refunded` is
 * true only once the charge is fully refunded. Amounts are the fallback for a
 * payload that omits the flag.
 */
export function isFullRefund(charge: Pick<Stripe.Charge, "refunded" | "amount" | "amount_refunded">): boolean {
  if (typeof charge.refunded === "boolean") return charge.refunded;
  if (Number.isFinite(charge.amount) && Number.isFinite(charge.amount_refunded)) return charge.amount_refunded >= charge.amount;
  return true;
}

async function handlePaymentSucceeded(session: Stripe.Checkout.Session, eventId: string, eventType: string, deps: WebhookDeps): Promise<void> {
  if (session.payment_status !== "paid") return;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const claimed = await deps.store.confirmPaymentAndEnqueue({
    checkoutSessionId: session.id,
    paymentIntentId,
    stripeEventId: eventId,
    stripeEventType: eventType,
  });
  if (!claimed) return;

  // Best-effort fast path. The webhook acknowledges once payment + outbox are
  // durable; scheduled workers own eventual delivery if this process dies.
  await processInventoryOutbox({ store: deps.store, commit: deps.commitInventory, release: deps.releaseInventory }, 1);
  await processOrderNotifications(deps.store, deps.notify, 1);
}

async function releaseOrderReservation(checkoutSessionId: string, deps: WebhookDeps): Promise<void> {
  const order = await deps.store.getByCheckoutSessionId(checkoutSessionId);
  if (!order?.inventoryReservationId || !order.inventoryReleaseRequestId) return;
  try {
    await (deps.releaseInventory ?? releaseInventory)(order.inventoryReservationId, "payment_not_completed", order.inventoryReleaseRequestId);
    await deps.store.markInventoryReleased(order.reference);
  } catch (error) {
    // A non-2xx makes Stripe retry the lifecycle event; the 247 release is
    // idempotent and a successful commit can never be released/restocked.
    logInventoryEvent("error", "inventory.release.failed", {
      orderReference: order.reference, reservationId: order.inventoryReservationId, requestId: order.inventoryReleaseRequestId,
      checkoutSessionId, errorCode: errorCodeOf(error),
    });
    throw error;
  }
}

export const defaultNotify = sendNotification;
