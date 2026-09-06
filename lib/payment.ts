/**
 * Payment integration boundary.
 *
 * No card details are ever collected or stored by this application. When a real
 * provider (Stripe) is configured via STRIPE_SECRET_KEY, wire its server SDK in
 * `createPaymentIntent` below. Until then the site runs a development/test
 * checkout that records the order intent and returns a test reference — no
 * charge, no PCI surface.
 */

import { randomUUID } from "node:crypto";
import type { CheckoutDetails } from "./checkout-validation";

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
  /** Present only in live mode once a provider is wired. */
  clientSecret?: string;
};

export function isPaymentConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createPaymentIntent(
  input: OrderIntentInput,
): Promise<OrderIntentResult> {
  void input; // reserved for the live provider integration below
  const reference = `AWT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  if (!isPaymentConfigured()) {
    // Development / test checkout — validated order captured, no charge taken.
    return { reference, mode: "test", requiresPayment: false };
  }

  // LIVE: integrate the Stripe server SDK here, e.g.
  //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   const intent = await stripe.paymentIntents.create({
  //     amount: Math.round(input.subtotal * 100),
  //     currency: "aud",
  //     metadata: { reference, totalTyres: String(input.totalTyres) },
  //   });
  //   return { reference, mode: "live", requiresPayment: true, clientSecret: intent.client_secret! };
  throw new Error("Payment provider configured but not yet wired. See lib/payment.ts.");
}
