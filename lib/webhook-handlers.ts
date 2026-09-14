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

/** How much queued work the webhook drains inline before handing off to cron. */
const FAST_PATH_LIMIT = 2;

/**
 * Processes one verified Stripe event. Signature verification happens in the
 * route handler (it needs the raw body); everything from here on operates on
 * the already-authenticated `event` object, which makes this function fully
 * unit-testable without a network call to Stripe.
 *
 * Durable state first, side effects second: a payment or cancellation is
 * persisted (with its Stripe event id as the idempotency gate and the 247
 * work it implies queued in the same transaction) before anything talks to
 * 247 or the mail transport. Only that persistence step may throw — a
 * non-2xx then makes Stripe redeliver. Inventory and notification outcomes
 * are drained best-effort here and owned by the cron worker afterwards, so
 * they can never make the Stripe response ambiguous or revert a payment.
 * See docs/payment-inventory-reconciliation.md.
 */
export async function processStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<void> {
  const { store } = deps;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        // e.g. completed with a delayed payment method — wait for async_payment_succeeded.
        await store.recordEvent(event.id, event.type, session.id);
        return;
      }
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      await store.confirmPaymentAndEnqueue({
        checkoutSessionId: session.id,
        paymentIntentId,
        stripeEventId: event.id,
        stripeEventType: event.type,
      });
      await drain(deps);
      return;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await store.recordEvent(event.id, event.type, session.id);
      const status = event.type === "checkout.session.expired" ? "cancelled" : "failed";
      const releaseQueued = await store.cancelPendingOrder(session.id, status);
      if (releaseQueued) await drain(deps);
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      await store.recordEvent(event.id, event.type, undefined);
      if (!paymentIntentId) return;
      // A FULL refund closes the order (refunded: never fulfilled or notified
      // from here on). A PARTIAL refund (delivery fee, price adjustment) leaves
      // a paid, fulfilable order. Neither restocks: a physical return is a
      // normal 247 stock-in, never an automatic release of a committed sale.
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

/**
 * Best-effort inline pass over queued 247 work and staff notifications. By
 * the time this runs the payment/cancellation is durable, so nothing here —
 * not even a database blip mid-claim — may turn into a non-2xx that makes
 * Stripe redeliver an already-recorded event. Cron owns whatever is left.
 */
async function drain(deps: WebhookDeps): Promise<void> {
  try {
    await processInventoryOutbox({ store: deps.store, commit: deps.commitInventory, release: deps.releaseInventory }, FAST_PATH_LIMIT);
    await processOrderNotifications(deps.store, deps.notify, 1);
  } catch (error) {
    logInventoryEvent("warn", "stripe.webhook.fast_path_deferred", { errorCode: errorCodeOf(error) });
  }
}

export const defaultNotify = sendNotification;
