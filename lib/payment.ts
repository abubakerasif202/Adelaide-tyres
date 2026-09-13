/**
 * Payment integration boundary.
 *
 * No card details are ever collected or stored by this application — Stripe
 * Checkout hosts the card entry page. This module only exists server-side.
 *
 * Card checkout stays disabled (falling back to the order-reference / invoice
 * flow — no charge, no card capture) unless STRIPE_SECRET_KEY,
 * STRIPE_WEBHOOK_SECRET, and a durable order-store connection string are all
 * present. A Stripe secret key alone is not sufficient: without the webhook
 * secret we cannot safely verify fulfilment events, and without a database
 * there is nowhere durable to record that an order was actually paid — see
 * lib/order-store.ts.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { getStripeClient, isStripeConfigured } from "./stripe-client.ts";
import { STRIPE_SESSION_TTL_MINUTES } from "./inventory/client.ts";
import { hasDurableOrderStore, getOrderStore } from "./order-store.ts";
import { business, order as orderConfig, siteUrl } from "./config.ts";
import type { CheckoutDetails } from "./checkout-validation.ts";

export type OrderIntentInput = {
  details: CheckoutDetails;
  lines: {
    id: string;
    brand: string;
    pattern: string;
    size: string;
    quantity: number;
    price: number;
  }[];
  totalTyres: number;
  subtotal: number;
  freeDelivery: boolean;
  deliveryFee: number;
};

export type OrderIntentResult = {
  reference: string;
  mode: "test" | "live";
  requiresPayment: boolean;
};

/** True once Stripe, its webhook secret, and a durable order store are all configured. */
export function isPaymentConfigured(): boolean {
  return isStripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET) && hasDurableOrderStore();
}

export function generateReference(checkoutAttemptId: string = randomUUID()): string {
  // The browser holds one UUID for the lifetime of a submit attempt. Deriving
  // the reference from it makes network retries converge on the same durable
  // order/reservation without accepting browser supplied prices or stock.
  return `AWT-${new Date().getFullYear()}-${checkoutAttemptId.slice(0, 8).toUpperCase()}`;
}

/** Order-reference checkout (existing invoice / EFT flow). No charge taken. */
export async function createPaymentIntent(
  input: OrderIntentInput,
): Promise<OrderIntentResult> {
  void input;
  return { reference: generateReference(), mode: "test", requiresPayment: false };
}

export type CheckoutSessionResult = {
  url: string;
  reference: string;
};

/**
 * Creates a Stripe Checkout Session for immediate card payment, and records
 * a pending order row before returning — the durable order store (not
 * Stripe's own object store, and never the client redirect) is the source of
 * truth the webhook and the success page both read from.
 */
export async function createCheckoutSession(
  input: OrderIntentInput,
  inventory: { reservationId: string; commitRequestId: string; releaseRequestId: string; reference: string },
): Promise<CheckoutSessionResult> {
  if (!isPaymentConfigured()) {
    throw new Error("Stripe is not fully configured.");
  }
  const stripe = getStripeClient();
  const reference = inventory.reference;

  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; metadata?: Record<string, string> };
    };
    quantity: number;
  }> = input.lines.map((line) => ({
    price_data: {
      currency: orderConfig.currency.toLowerCase(),
      unit_amount: Math.round(line.price * 100),
      product_data: {
        name: `${line.brand} ${line.pattern} ${line.size}`,
        metadata: { tyre_id: line.id },
      },
    },
    quantity: line.quantity,
  }));

  if (input.deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: orderConfig.currency.toLowerCase(),
        unit_amount: Math.round(input.deliveryFee * 100),
        product_data: { name: "Adelaide-wide delivery" },
      },
      quantity: 1,
    });
  }

  const address =
    input.details.deliveryMethod === "delivery"
      ? `${input.details.address}, ${input.details.suburb} SA ${input.details.postcode}`
      : orderConfig.pickup.address;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // The Checkout Session must expire before the 247 stock hold does, so a
    // late payment can never land on an already-released reservation.
    expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_TTL_MINUTES * 60,
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: input.details.email,
    client_reference_id: reference,
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?cancelled=1`,
    metadata: { reference, business: business.shortName },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout Session URL.");
  }

  const amountTotalCents =
    session.amount_total ?? Math.round((input.subtotal + input.deliveryFee) * 100);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  const store = await getOrderStore();
  await store.createPendingOrder({
    reference,
    checkoutSessionId: session.id,
    paymentIntentId,
    amountTotalCents,
    currency: orderConfig.currency,
    customerEmail: input.details.email,
    customerName: input.details.name,
    customerPhone: input.details.phone,
    deliveryMethod: input.details.deliveryMethod,
    deliveryAddress: address,
    notes: input.details.notes ?? "",
    lines: input.lines,
    inventoryReservationId: inventory.reservationId,
    inventoryStatus: "reserved",
    inventoryCommitRequestId: inventory.commitRequestId,
    inventoryReleaseRequestId: inventory.releaseRequestId,
  });

  return { url: session.url, reference };
}
