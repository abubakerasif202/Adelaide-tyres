import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe-client";
import { getOrderStore } from "@/lib/order-store";
import { processStripeEvent, defaultNotify } from "@/lib/webhook-handlers";

// Needs the raw request body for signature verification — must run on Node,
// not the Edge runtime, and must not have its body pre-parsed.
export const runtime = "nodejs";

/**
 * Stripe webhook handler. Verifies the signature against the raw body, then
 * hands the authenticated event to processStripeEvent() (lib/webhook-handlers.ts),
 * which is unit-tested directly for concurrency and duplicate-delivery safety.
 * Every state transition it makes is a guarded database operation — see
 * lib/order-store-neon.ts — so a redelivered or duplicate event can never
 * double-fulfil an order or send a duplicate notification.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is unset; refusing to process webhook.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const store = await getOrderStore();
    await processStripeEvent(event, { store, notify: defaultNotify });
  } catch (err) {
    console.error(`Stripe webhook handling failed for ${event.type}`, err);
    // A non-2xx response tells Stripe to retry delivery later. Every
    // transition in processStripeEvent is idempotent/guarded, so a retry —
    // of this event or a concurrently-arriving duplicate — is always safe.
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
