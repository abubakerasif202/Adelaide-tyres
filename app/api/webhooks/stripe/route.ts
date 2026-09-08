import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe-client";
import { sendNotification } from "@/lib/notify";
import { order as orderConfig } from "@/lib/config";

// Needs the raw request body for signature verification — must run on Node,
// not the Edge runtime, and must not have its body pre-parsed.
export const runtime = "nodejs";

/**
 * Stripe webhook handler. Verifies the signature against the raw body, then
 * fulfils paid Checkout Sessions exactly once.
 *
 * Idempotency: this project has no order database, so the PaymentIntent's own
 * metadata is the durable "fulfilled" flag — metadata can be read and updated
 * on a PaymentIntent regardless of its status, so a retried or duplicate
 * `checkout.session.completed` event (Stripe redelivers on timeout, and the
 * same event can also arrive out of order relative to async payment methods)
 * is detected and skipped rather than re-sent.
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
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfilCheckoutSession(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        // No fulfilment occurred; nothing to reverse. Left for observability.
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handling failed for ${event.type}`, err);
    // A 500 tells Stripe to retry delivery; the fulfilled-flag check makes
    // the eventual retry safe.
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function fulfilCheckoutSession(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) {
    console.error("Checkout Session has no PaymentIntent; cannot verify fulfilment state.", session.id);
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.metadata.fulfilled === "true") {
    // Already handled by a prior delivery of this (or an equivalent) event.
    return;
  }

  const meta = session.metadata ?? {};
  const reference = meta.reference ?? session.client_reference_id ?? paymentIntentId;
  const totalAud = ((session.amount_total ?? 0) / 100).toFixed(2);

  const { delivered } = await sendNotification({
    subject: `PAID order ${reference} · ${totalAud} AUD`,
    replyTo: meta.email,
    text: [
      `Reference: ${reference} (Stripe Checkout — PAID)`,
      `Payment intent: ${paymentIntentId}`,
      `Contact: ${meta.name ?? ""} · ${meta.phone ?? ""} · ${meta.email ?? ""}`,
      meta.abn ? `ABN: ${meta.abn}` : "",
      `Fulfilment: ${meta.deliveryMethod ?? "delivery"}`,
      meta.address ? `Address: ${meta.address}` : `Pickup: ${orderConfig.pickup.address}`,
      "",
      `Lines: ${meta.lines ?? "(see Stripe Checkout Session for full line items)"}`,
      "",
      `Total tyres: ${meta.totalTyres ?? "?"}`,
      `Amount paid: $${totalAud} AUD`,
      meta.notes ? `Notes: ${meta.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (!delivered) {
    // Notification transport is unconfigured/unavailable. Do not mark the
    // PaymentIntent as fulfilled — the next retry of this webhook should try
    // again rather than silently drop a paid order.
    console.error(`Order ${reference} paid but notification could not be delivered.`);
    throw new Error("Notification transport unavailable.");
  }

  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: { ...paymentIntent.metadata, fulfilled: "true" },
  });
}
