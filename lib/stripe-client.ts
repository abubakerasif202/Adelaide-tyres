/**
 * Server-only Stripe SDK singleton. Never import this from a Client Component —
 * it reads the secret key and must not be bundled for the browser. Only
 * Route Handlers and Server Components (app/api/**, app/checkout/success)
 * import this module.
 */
import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Local cross-system testing only: point the SDK at a loopback Stripe stand-in
 * so the real checkout → webhook path can be exercised without network egress.
 * Any non-loopback host is ignored, so this can never redirect production
 * traffic; webhook signature verification is unaffected.
 */
function localApiOverride(): Pick<Stripe.StripeConfig, "host" | "port" | "protocol"> | null {
  const base = process.env.STRIPE_API_BASE;
  if (!base) return null;
  let url: URL;
  try { url = new URL(base); } catch { return null; }
  if (!LOOPBACK_HOSTS.has(url.hostname) || url.protocol !== "http:") return null;
  return { host: url.hostname, port: Number(url.port || 80), protocol: "http" };
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured: STRIPE_SECRET_KEY is unset.");
  }
  if (!client) {
    client = new Stripe(key, {
      appInfo: { name: "Adelaide Wholesale Tyres", version: "1.0.0" },
      ...(localApiOverride() ?? {}),
    });
  }
  return client;
}
