import { NextResponse } from "next/server";
import { readSubmission } from "@/lib/request-body";
import { validateOrderLines } from "@/lib/order-lines";
import { order } from "@/lib/config";
import { validateCheckoutDetails, hasErrors, type CheckoutDetails } from "@/lib/checkout-validation";
import { createCheckoutSession, isPaymentConfigured } from "@/lib/payment";
import {
  clampString,
  clientKey,
  isSameOrigin,
  looksAutomated,
  rateLimit,
} from "@/lib/submission-security";

/** Creates a Stripe Checkout Session for immediate card payment. */
export async function POST(request: Request) {
  if (!isPaymentConfigured()) {
    return NextResponse.json(
      { error: "Card payment is not available yet. Please submit your order for invoice instead." },
      { status: 503 },
    );
  }
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!rateLimit(`checkout:${await clientKey()}`, 6)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readSubmission(request);
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (looksAutomated({ honeypot: body.company_website, startedAt: Number(body.startedAt) })) {
    return NextResponse.json({ error: "Please try again." }, { status: 400 });
  }

  const rawDetails = (body.details ?? {}) as Record<string, unknown>;
  const details: CheckoutDetails = {
    name: clampString(rawDetails.name, 120),
    phone: clampString(rawDetails.phone, 40),
    email: clampString(rawDetails.email, 160),
    suburb: clampString(rawDetails.suburb, 80),
    postcode: clampString(rawDetails.postcode, 10),
    address: clampString(rawDetails.address, 240),
    abn: clampString(rawDetails.abn, 20),
    notes: clampString(rawDetails.notes, 1000),
    deliveryMethod: rawDetails.deliveryMethod === "pickup" ? "pickup" : "delivery",
  };

  const errors = validateCheckoutDetails(details);
  if (hasErrors(errors)) {
    return NextResponse.json({ error: "Please check the highlighted fields.", errors }, { status: 422 });
  }

  const validated = validateOrderLines(body.lines);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 409 });
  }
  const lines = validated.lines;
  if (lines.length > 20) {
    return NextResponse.json(
      { error: "This order has too many distinct items for card checkout — please submit for invoice instead." },
      { status: 413 },
    );
  }
  const totalTyres = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const freeDelivery =
    details.deliveryMethod === "pickup" || totalTyres >= order.delivery.freeQualifyingTyres;
  const deliveryFee = freeDelivery ? 0 : order.delivery.feeAud;

  try {
    const session = await createCheckoutSession({
      details,
      lines,
      totalTyres,
      subtotal,
      freeDelivery,
      deliveryFee,
    });
    return NextResponse.json({ url: session.url, reference: session.reference });
  } catch (err) {
    console.error("Stripe Checkout Session creation failed", err);
    return NextResponse.json({ error: "Could not start card checkout. Please try again or submit for invoice." }, { status: 502 });
  }
}
