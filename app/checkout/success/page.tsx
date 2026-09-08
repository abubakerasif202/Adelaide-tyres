import type { Metadata } from "next";
import Link from "next/link";
import { isStripeConfigured, getStripeClient } from "@/lib/stripe-client";
import { formatTotal } from "@/lib/format";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";

export const metadata: Metadata = {
  title: "Order confirmed",
  alternates: { canonical: "/checkout/success" },
  robots: { index: false, follow: true },
};

type Status = "paid" | "pending" | "not-found" | "unavailable";

async function getSessionStatus(
  sessionId: string | undefined,
): Promise<{ status: Status; reference?: string; amount?: string }> {
  if (!isStripeConfigured()) return { status: "unavailable" };
  if (!sessionId) return { status: "not-found" };

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const reference = session.metadata?.reference ?? session.client_reference_id ?? sessionId;
    const amount =
      typeof session.amount_total === "number" ? formatTotal(session.amount_total / 100) : undefined;

    // The success URL alone never proves payment — only Stripe's own record
    // of the session's payment_status does.
    if (session.payment_status === "paid") {
      return { status: "paid", reference, amount };
    }
    return { status: "pending", reference, amount };
  } catch (err) {
    console.error("Could not retrieve Checkout Session", err);
    return { status: "not-found" };
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const result = await getSessionStatus(sessionId);

  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x py-16">
        <div className="surface-card mx-auto max-w-lg p-8 text-center">
          {result.status === "paid" && (
            <>
              <ClearCartOnMount />
              <span className="pill pill--green">Payment received</span>
              <h1 className="display mt-4 text-[32px]">Thanks — your order is paid</h1>
              <p className="mt-2 text-[var(--color-text-muted)]">
                Reference <strong className="text-[var(--color-text)]">{result.reference}</strong>
                {result.amount ? <> · {result.amount} paid</> : null}. The wholesale team will confirm
                dispatch or pickup details shortly.
              </p>
            </>
          )}

          {result.status === "pending" && (
            <>
              <span className="pill">Payment processing</span>
              <h1 className="display mt-4 text-[32px]">Your payment is still processing</h1>
              <p className="mt-2 text-[var(--color-text-muted)]">
                Reference <strong className="text-[var(--color-text)]">{result.reference}</strong>. Some
                payment methods take a little longer to confirm — we&apos;ll email you as soon as it
                clears. No need to pay again.
              </p>
            </>
          )}

          {(result.status === "not-found" || result.status === "unavailable") && (
            <>
              <span className="pill pill--red">Unable to confirm</span>
              <h1 className="display mt-4 text-[32px]">We couldn&apos;t verify this payment</h1>
              <p className="mt-2 text-[var(--color-text-muted)]">
                If you completed payment on Stripe&apos;s checkout page, please contact the wholesale
                team with your bank/card statement reference so we can confirm it manually — your cart
                has not been cleared.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/tyres" className="btn btn--green">
              Continue shopping
            </Link>
            <Link href="/contact" className="btn btn--outline">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
