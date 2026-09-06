import { NextResponse } from "next/server";
import { getTyreBySlug } from "@/lib/catalogue";
import { order } from "@/lib/config";
import { validateCheckoutDetails, hasErrors, type CheckoutDetails } from "@/lib/checkout-validation";
import { createPaymentIntent } from "@/lib/payment";
import { sendNotification } from "@/lib/notify";
import {
  clampString,
  clientKey,
  isSameOrigin,
  looksAutomated,
  rateLimit,
} from "@/lib/submission-security";

type IncomingLine = { slug?: unknown; quantity?: unknown };

export async function POST(request: Request) {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!rateLimit(`orders:${await clientKey()}`, 6)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
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

  // Re-price and re-validate stock server-side from the catalogue — never trust
  // client prices.
  const incoming = Array.isArray(body.lines) ? (body.lines as IncomingLine[]) : [];
  const lines = [];
  for (const item of incoming) {
    const tyre = typeof item.slug === "string" ? getTyreBySlug(item.slug) : undefined;
    const quantity = Math.floor(Number(item.quantity));
    if (!tyre || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "One or more items are no longer available." }, { status: 409 });
    }
    if (tyre.stock > 0 && quantity > tyre.stock) {
      return NextResponse.json(
        { error: `Only ${tyre.stock} of ${tyre.brand} ${tyre.pattern} ${tyre.size} available.` },
        { status: 409 },
      );
    }
    lines.push({
      id: tyre.id,
      brand: tyre.brand,
      pattern: tyre.pattern,
      size: tyre.size,
      quantity,
      price: tyre.price,
    });
  }

  const totalTyres = lines.reduce((sum, l) => sum + l.quantity, 0);
  if (lines.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 422 });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const freeDelivery =
    details.deliveryMethod === "pickup" || totalTyres >= order.delivery.freeQualifyingTyres;
  const deliveryFee = freeDelivery ? 0 : order.delivery.feeAud;

  const intent = await createPaymentIntent({
    details,
    lines,
    totalTyres,
    subtotal,
    freeDelivery,
    deliveryFee,
  });

  try {
    await sendNotification({
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
  } catch (err) {
    console.error("Order notification failed", err);
    // The order is still valid; surface a soft warning to the client.
    return NextResponse.json({ ...intent, subtotal, totalTyres, notified: false });
  }

  return NextResponse.json({ ...intent, subtotal, totalTyres, notified: true });
}
