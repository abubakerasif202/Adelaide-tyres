import { NextResponse } from "next/server";
import { isPaymentConfigured } from "@/lib/payment";

/**
 * Whether card checkout is actually usable right now. The client must not
 * infer this from the presence of NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY alone —
 * that only proves a publishable key was baked into the build, not that the
 * webhook secret and durable order store required to safely fulfil a payment
 * are configured. See lib/payment.ts:isPaymentConfigured.
 */
export async function GET() {
  return NextResponse.json({ enabled: isPaymentConfigured() });
}
