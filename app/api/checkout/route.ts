import { NextResponse } from "next/server";
import { readSubmission } from "@/lib/request-body";
import { validateOrderLines } from "@/lib/order-lines";
import { order } from "@/lib/config";
import { validateCheckoutDetails, hasErrors, type CheckoutDetails } from "@/lib/checkout-validation";
import { createCheckoutSession, generateReference, isPaymentConfigured } from "@/lib/payment";
import { releaseInventory, reserveInventory } from "@/lib/inventory/client";
import { InventoryConflictError, InventoryUnavailableError } from "@/lib/inventory/types";
import { randomUUID } from "node:crypto";
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
  const checkoutAttemptId = typeof body.checkoutAttemptId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.checkoutAttemptId)
    ? body.checkoutAttemptId
    : null;
  if (!checkoutAttemptId) return NextResponse.json({ error: "Invalid checkout attempt." }, { status: 400 });

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

  let reservationId: string | null = null;
  let releaseRequestId: string | null = null;
  try {
    const reference = generateReference(checkoutAttemptId);
    const reservation = await reserveInventory(reference, lines, checkoutAttemptId);
    reservationId = reservation.reservationId;
    releaseRequestId = randomUUID();
    const session = await createCheckoutSession({
      details,
      lines,
      totalTyres,
      subtotal,
      freeDelivery,
      deliveryFee,
    }, { reservationId: reservation.reservationId, reference, commitRequestId: randomUUID(), releaseRequestId });
    return NextResponse.json({ url: session.url, reference: session.reference });
  } catch (err) {
    if (reservationId && releaseRequestId) {
      try { await releaseInventory(reservationId, "checkout_start_failed", releaseRequestId); } catch { /* 247 expiry/reconciliation retains safe hold if recovery is unavailable */ }
    }
    // Inventory outcomes are customer-facing and never blamed on the card
    // provider: a stock conflict is a 409, an unreachable 247 fails closed.
    if (err instanceof InventoryConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof InventoryUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("Stripe Checkout Session creation failed", err);
    return NextResponse.json({ error: "Could not start card checkout. Please try again or submit for invoice." }, { status: 502 });
  }
}
