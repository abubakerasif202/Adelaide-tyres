/**
 * Payment integration boundary.
 *
 * No card details are ever collected or stored by this application — Stripe
 * Checkout hosts the card entry page. This module only exists server-side.
 *
 * When STRIPE_SECRET_KEY is unset, checkout falls back to the order-reference
 * flow (no charge, no card capture) so the site never claims a live payment
 * capability it cannot honour. Only Route Handlers import this module.
 */
import { randomUUID } from "node:crypto";
import { getStripeClient, isStripeConfigured } from "./stripe-client.ts";
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

/** True once a secret key is present. Metadata still governs test/live mode. */
export function isPaymentConfigured(): boolean {
  return isStripeConfigured();
}

function generateReference(): string {
  return `AWT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
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
 * Creates a Stripe Checkout Session for immediate card payment. Prices are
 * computed entirely from the already-revalidated, server-trusted order
 * lines/delivery fee — nothing here is sourced from client-submitted amounts.
 *
 * Metadata carries the fields needed to fulfil the order from the webhook
 * (see app/api/webhooks/stripe/route.ts), since this project has no order
 * database — Stripe's own object store is the persistence layer for this
 * reference and its fulfilment flag.
 */
export async function createCheckoutSession(
  input: OrderIntentInput,
): Promise<CheckoutSessionResult> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }
  const stripe = getStripeClient();
  const reference = generateReference();

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

  const linesSummary = input.lines
    .map((l) => `${l.quantity}x ${l.brand} ${l.pattern} ${l.size}`)
    .join(" | ")
    .slice(0, 480);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: input.details.email,
    client_reference_id: reference,
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?cancelled=1`,
    metadata: {
      reference,
      business: business.shortName,
      name: input.details.name.slice(0, 200),
      phone: input.details.phone.slice(0, 60),
      email: input.details.email.slice(0, 160),
      abn: (input.details.abn ?? "").slice(0, 20),
      deliveryMethod: input.details.deliveryMethod,
      address: input.details.deliveryMethod === "delivery"
        ? `${input.details.address}, ${input.details.suburb} SA ${input.details.postcode}`.slice(0, 300)
        : orderConfig.pickup.address,
      notes: (input.details.notes ?? "").slice(0, 400),
      totalTyres: String(input.totalTyres),
      lines: linesSummary,
      fulfilled: "false",
    },
    payment_intent_data: {
      metadata: { reference, fulfilled: "false" },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout Session URL.");
  }

  return { url: session.url, reference };
}
