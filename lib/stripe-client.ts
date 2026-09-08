/**
 * Server-only Stripe SDK singleton. Never import this from a Client Component —
 * it reads the secret key and must not be bundled for the browser. Only
 * Route Handlers and Server Components (app/api/**, app/checkout/success)
 * import this module.
 */
import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured: STRIPE_SECRET_KEY is unset.");
  }
  if (!client) {
    client = new Stripe(key, {
      appInfo: { name: "Adelaide Wholesale Tyres", version: "1.0.0" },
    });
  }
  return client;
}
