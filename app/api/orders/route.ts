import { NextResponse } from "next/server";
import { readSubmission } from "@/lib/request-body";
import { validateOrderLines } from "@/lib/order-lines";
import { order } from "@/lib/config";
import { validateCheckoutDetails, hasErrors, type CheckoutDetails } from "@/lib/checkout-validation";
import { generateReference } from "@/lib/payment";
import { getOrderStore, hasDurableOrderStore } from "@/lib/order-store";
import { releaseInventory, reserveInventory } from "@/lib/inventory/client";
import { InventoryConflictError } from "@/lib/inventory/types";
import { randomUUID } from "node:crypto";
import { sendNotification } from "@/lib/notify";
import {
  clampString,
  clientKey,
  isSameOrigin,
  looksAutomated,
  rateLimit,
} from "@/lib/submission-security";

export async function POST(request: Request) {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!rateLimit(`orders:${await clientKey()}`, 6)) {
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
    // Silently accept so bots get no signal; nothing is processed.
    return NextResponse.json({ reference: "AWT-TEST-0000", mode: "test", requiresPayment: false });
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
  const totalTyres = lines.reduce((sum, line) => sum + line.quantity, 0);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const freeDelivery =
    details.deliveryMethod === "pickup" || totalTyres >= order.delivery.freeQualifyingTyres;
  const deliveryFee = freeDelivery ? 0 : order.delivery.feeAud;

  const checkoutAttemptId = typeof body.checkoutAttemptId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.checkoutAttemptId)
    ? body.checkoutAttemptId
    : null;
  if (!checkoutAttemptId) return NextResponse.json({ error: "Invalid checkout attempt." }, { status: 400 });
  if (!hasDurableOrderStore()) {
    return NextResponse.json({ error: "We're confirming tyre availability. Please try again shortly." }, { status: 503 });
  }

  const reference = generateReference(checkoutAttemptId);
  const releaseRequestId = randomUUID();
  let reservationId: string | null = null;
  try {
    const reservation = await reserveInventory(reference, lines, checkoutAttemptId);
    reservationId = reservation.reservationId;
    await (await getOrderStore()).createPendingOrder({
      reference,
      checkoutSessionId: null,
      paymentIntentId: null,
      amountTotalCents: Math.round((subtotal + deliveryFee) * 100),
      currency: order.currency,
      customerEmail: details.email,
      customerName: details.name,
      customerPhone: details.phone,
      deliveryMethod: details.deliveryMethod,
      deliveryAddress: details.deliveryMethod === "delivery" ? `${details.address}, ${details.suburb} SA ${details.postcode}` : order.pickup.address,
      notes: details.notes ?? "",
      lines,
      inventoryReservationId: reservationId,
      inventoryStatus: "reserved",
      inventoryCommitRequestId: randomUUID(),
      inventoryReleaseRequestId: releaseRequestId,
    });
  } catch (error) {
    if (reservationId) try { await releaseInventory(reservationId, "reference_order_persistence_failed", releaseRequestId); } catch { /* expiry/reconciliation is the safe fallback */ }
    if (error instanceof InventoryConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Reference order inventory reservation failed", error);
    return NextResponse.json({ error: "We're confirming tyre availability. Please try again shortly." }, { status: 503 });
  }

  const intent = { reference, mode: "test" as const, requiresPayment: false };

  try {
    const { delivered } = await sendNotification({
      subject: `New bulk order ${intent.reference} · ${totalTyres} tyres`,
      replyTo: details.email,
      text: [
        `Reference: ${intent.reference} (${intent.mode})`,
        `Contact: ${details.name} · ${details.phone} · ${details.email}`,
        details.abn ? `ABN: ${details.abn}` : "",
        `Fulfilment: ${details.deliveryMethod}`,
        details.deliveryMethod === "delivery"
          ? `Address: ${details.address}, ${details.suburb} SA ${details.postcode}`
          : `Pickup: ${order.pickup.address}`,
        "",
        ...lines.map((l) => `  ${l.quantity} × ${l.brand} ${l.pattern} ${l.size} @ $${l.price}`),
        "",
        `Total tyres: ${totalTyres}`,
        `Subtotal: $${subtotal} AUD`,
        `Delivery: ${
          details.deliveryMethod === "pickup"
            ? "Free warehouse pickup"
            : freeDelivery
              ? "Free Adelaide-wide"
              : `$${deliveryFee} Adelaide-wide`
        }`,
        details.notes ? `Notes: ${details.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return NextResponse.json({ ...intent, subtotal, totalTyres, notified: delivered });
  } catch (err) {
    console.error("Order notification failed", err);
    // The order is still valid; surface a soft warning to the client.
    return NextResponse.json({ ...intent, subtotal, totalTyres, notified: false });
  }
}
