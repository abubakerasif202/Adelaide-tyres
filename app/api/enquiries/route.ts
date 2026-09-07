import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notify";
import {
  clampString,
  clientKey,
  isSameOrigin,
  looksAutomated,
  rateLimit,
} from "@/lib/submission-security";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!rateLimit(`enquiries:${await clientKey()}`, 6)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (looksAutomated({ honeypot: body.company_website, startedAt: Number(body.startedAt) })) {
    return NextResponse.json({ ok: true });
  }

  const name = clampString(body.name, 120).trim();
  const email = clampString(body.email, 160).trim();
  const phone = clampString(body.phone, 40).trim();
  const businessName = clampString(body.business, 160).trim();
  const product = clampString(body.product, 160).trim();
  const quantity = clampString(body.quantity, 40).trim();
  const message = clampString(body.message, 2000).trim();
  const kind = body.type === "quote" ? "Wholesale quote" : "Enquiry";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (!message && !product) fieldErrors.message = "Tell us what you need.";
  if (body.consent !== true) fieldErrors.consent = "Please confirm you agree to be contacted.";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please check the form.", errors: fieldErrors }, { status: 422 });
  }

  try {
    const { delivered } = await sendNotification({
      subject: `${kind} — ${name}${businessName ? ` (${businessName})` : ""}`,
      replyTo: email,
      text: [
        `Type: ${kind}`,
        `Name: ${name}`,
        businessName ? `Business: ${businessName}` : "",
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : "",
        product ? `Tyre size / product: ${product}` : "",
        quantity ? `Quantity: ${quantity}` : "",
        "",
        message || "(no message)",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return NextResponse.json({ ok: true, delivered });
  } catch (err) {
    console.error("Enquiry notification failed", err);
    return NextResponse.json(
      { error: "We couldn't send that just now. Please call or email us directly." },
      { status: 502 },
    );
  }
}
