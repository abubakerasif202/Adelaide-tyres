"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { getDeliveryFee, getLineSubtotal, qualifiesForFreeDelivery } from "@/lib/cart";
import { business, order } from "@/lib/config";
import { formatCurrency, formatTotal } from "@/lib/format";
import { tyreFullName } from "@/lib/tyre";
import {
  EMPTY_CHECKOUT_DETAILS,
  hasErrors,
  validateCheckoutDetails,
  type CheckoutDetails,
  type CheckoutErrors,
} from "@/lib/checkout-validation";
import { CheckoutProgress, type CheckoutStepIndex } from "@/components/CheckoutProgress";
import { FormField } from "@/components/FormField";
import { QuantitySelector } from "@/components/QuantitySelector";
import { TyreImage } from "@/components/TyreImage";
import { DeliveryStatus } from "@/components/DeliveryStatus";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const { cart, hydrated, totalTyres, subtotal, setQuantity, clear } = useCart();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";
  const [step, setStep] = useState<CheckoutStepIndex>(0);
  const [details, setDetails] = useState<CheckoutDetails>(EMPTY_CHECKOUT_DETAILS);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // Kept separate from `submitting`: once the Stripe URL is handed to the
  // browser the button must stay disabled through the navigation, but a failed
  // request has to re-enable it (C-1).
  const [redirecting, setRedirecting] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ reference: string; mode: string; notified: boolean } | null>(null);
  const [startedAt] = useState(() => Date.now());
  // Never inferred from a build-time env var — the server is the only source
  // of truth for whether Stripe, its webhook, and the order store are all
  // actually configured (see app/api/checkout/status/route.ts).
  const [stripeEnabled, setStripeEnabled] = useState(false);
  useEffect(() => {
    let ignore = false;
    fetch("/api/checkout/status")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setStripeEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!ignore) setStripeEnabled(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (hasErrors(errors)) document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  // A bare setStep leaves the viewport mid-page and strands keyboard/SR focus
  // on the button that just unmounted (H-5).
  const isFirstStepRender = useRef(true);
  const submitErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    stepHeadingRef.current?.focus();
  }, [step]);

  // Three failure branches (payByCard catch, placeOrder catch, and the
  // `notified !== true` branch) set submitError WITHOUT changing step, so the
  // [step] effect never runs and the banner — hoisted above the step heading —
  // renders offscreen while the user is still at the bottom of the payment
  // step. Driving scroll+focus from the error itself covers every path.
  //
  // Declared AFTER the [step] effect on purpose: on the server-validation path
  // (setErrors + setStep(1) + setSubmitError in one batch) both effects run in
  // the same commit, and the later one wins — so the banner keeps focus rather
  // than the step heading, which is the desired outcome.
  useEffect(() => {
    if (!submitError) return;
    const banner = submitErrorRef.current;
    if (!banner) return;
    // preventScroll avoids the browser's instant focus-scroll fighting the
    // smooth scrollIntoView below.
    banner.focus({ preventScroll: true });
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitError]);

  const destination = { method: details.deliveryMethod };
  const freeDelivery = qualifiesForFreeDelivery(cart, destination);
  const deliveryFee = getDeliveryFee(cart, destination);

  const set = (patch: Partial<CheckoutDetails>) => setDetails((d) => ({ ...d, ...patch }));

  const summaryRows = useMemo(
    () => [
      { label: "Tyre subtotal", value: formatCurrency(subtotal) },
      { label: "Total tyres", value: String(totalTyres) },
      { label: "Delivery", value: freeDelivery ? "Free" : formatCurrency(deliveryFee) },
      { label: "Wholesale pricing", value: order.pricingIsPlaceholder ? "Test pricing" : "Current" },
    ],
    [subtotal, totalTyres, freeDelivery, deliveryFee],
  );

  if (hydrated && cart.lines.length === 0 && !confirmation) {
    return (
      <Shell step={0}>
        <div className="surface-card p-10 text-center">
          <h1 className="display text-[26px]">Nothing to check out</h1>
          <p className="mx-auto mt-2 max-w-md text-[var(--color-text-muted)]">
            No minimum order — add any tyres to start a wholesale order.
          </p>
          <Link href="/tyres" className="btn btn--green mt-6">
            Shop available stock
          </Link>
        </div>
      </Shell>
    );
  }

  // Back is user-initiated, not failure-initiated: a stale banner would
  // otherwise re-render and steal focus from the step the user asked for,
  // announcing an already-resolved error as new.
  function goBack(target: CheckoutStepIndex) {
    setSubmitError(null);
    setStep(target);
  }

  function goToDelivery() {
    setStep(1);
  }

  function goToPayment() {
    const found = validateCheckoutDetails(details);
    setErrors(found);
    if (!hasErrors(found)) setStep(2);
  }

  async function payByCard() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt,
          company_website: "",
          details,
          lines: cart.lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        if (data.errors) setErrors(data.errors);
        setSubmitError(data.error ?? "Could not start card checkout. Please try again.");
        if (data.errors) setStep(1);
        return;
      }
      setRedirecting(true);
      window.location.href = data.url;
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function placeOrder() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt,
          company_website: "",
          details,
          lines: cart.lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        if (data.errors) setStep(1);
        return;
      }
      if (data.notified !== true) {
        setSubmitError("Your order request could not be delivered. Your cart and details are still here. Please contact the wholesale team before retrying if you are unsure whether they received it.");
        return;
      }
      setConfirmation({ reference: data.reference, mode: data.mode, notified: data.notified });
      setStep(3);
      clear();
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <Shell step={0}>
        <p className="text-[var(--color-text-muted)]">Loading your order…</p>
      </Shell>
    );
  }

  return (
    <Shell step={step}>
      {submitError && step < 3 && (
        <p ref={submitErrorRef} tabIndex={-1} role="alert" className="field-error surface-card mb-6 p-4 text-[14px] focus:outline-none">
          {submitError}
        </p>
      )}
      {cancelled && step < 3 && (
        <p className="surface-card mb-6 p-4 text-[14px]" role="status">
          Payment was cancelled — your cart is unchanged. You can try again or submit for invoice.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {step === 0 && (
            <section aria-labelledby="cart-step">
              <h1 ref={stepHeadingRef} tabIndex={-1} id="cart-step" className="display text-[clamp(28px,4vw,40px)] focus:outline-none">
                Your bulk order
              </h1>
              <div className="mt-4">
                <DeliveryStatus
                  totalTyres={totalTyres}
                  qualifiesForFreeDelivery={totalTyres >= order.delivery.freeQualifyingTyres}
                  deliveryFee={getDeliveryFee(cart)}
                />
              </div>
              <ul className="mt-5 flex flex-col gap-4">
                {cart.lines.map((line) => (
                  <li key={line.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]">
                      <TyreImage src={line.image} alt={tyreFullName(line)} size={52} />
                    </div>
                    <div className="min-w-[130px] flex-1">
                      <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-red)]">
                        {line.brand}
                      </span>
                      <p className="display text-[20px]">{line.size}</p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        Pattern {line.pattern} · {line.stock} in stock
                      </p>
                    </div>
                    <QuantitySelector
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.id, q)}
                      min={1}
                      max={line.stock}
                      disabled={line.stock <= 0}
                      label={`Quantity for ${tyreFullName(line)}`}
                      size="sm"
                    />
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                        {formatCurrency(line.price)} ea
                      </p>
                      <p className="display text-[18px]">{formatCurrency(getLineSubtotal(line))}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn btn--red" onClick={goToDelivery}>
                  Continue to delivery
                </button>
                <Link href="/tyres" className="btn btn--outline">
                  Back to stock
                </Link>
              </div>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="delivery-step">
              <h1 ref={stepHeadingRef} tabIndex={-1} id="delivery-step" className="display text-[clamp(28px,4vw,40px)] focus:outline-none">
                Delivery details
              </h1>
              <p className="mt-2 text-[var(--color-text-muted)]">
                No minimum order. {formatCurrency(order.delivery.feeAud)} {business.serviceArea.label}{" "}
                delivery under {order.delivery.freeQualifyingTyres} tyres, free from{" "}
                {order.delivery.freeQualifyingTyres} tyres up.
              </p>

              <fieldset className="mt-5">
                <legend className="field-label">Fulfilment</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FulfilmentOption
                    checked={details.deliveryMethod === "delivery"}
                    onChange={() => set({ deliveryMethod: "delivery" })}
                    title="Adelaide delivery"
                    copy={`${getDeliveryFee(cart) === 0 ? "FREE" : formatCurrency(getDeliveryFee(cart))} · ${business.serviceArea.description}`}
                  />
                  <FulfilmentOption
                    checked={details.deliveryMethod === "pickup"}
                    onChange={() => set({ deliveryMethod: "pickup" })}
                    title="Warehouse pickup"
                    copy={order.pickup.address}
                  />
                </div>
              </fieldset>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <FormField label="Business / name" name="name" value={details.name} onChange={(v) => set({ name: v })} required error={errors.name} autoComplete="organization" placeholder="Your business or name" />
                <FormField label="Phone" name="phone" value={details.phone} onChange={(v) => set({ phone: v })} required error={errors.phone} autoComplete="tel" inputMode="tel" placeholder="04xx xxx xxx" />
                <FormField label="Email" name="email" type="email" value={details.email} onChange={(v) => set({ email: v })} required error={errors.email} autoComplete="email" inputMode="email" placeholder="name@business.com.au" />
                <FormField label="Business ABN" name="abn" value={details.abn ?? ""} onChange={(v) => set({ abn: v })} optional error={errors.abn} placeholder="11 digits" />
                {details.deliveryMethod === "delivery" && (
                  <>
                    <FormField label="Suburb" name="suburb" value={details.suburb} onChange={(v) => set({ suburb: v })} required error={errors.suburb} autoComplete="address-level2" placeholder="Adelaide" />
                    <FormField label="Postcode" name="postcode" value={details.postcode} onChange={(v) => set({ postcode: v })} required error={errors.postcode} autoComplete="postal-code" inputMode="numeric" placeholder="5000" />
                    <div className="sm:col-span-2">
                      <FormField label="Delivery address" name="address" value={details.address} onChange={(v) => set({ address: v })} required error={errors.address} autoComplete="street-address" placeholder="Street address, suburb, SA postcode" />
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <FormField label="Order notes" name="notes" value={details.notes ?? ""} onChange={(v) => set({ notes: v })} optional textarea error={errors.notes} placeholder="Delivery access, purchase order number, preferred day…" />
                </div>
              </div>

              {details.deliveryMethod === "pickup" && (
                <p className="mt-4 rounded-[var(--radius-sm)] bg-[#eef5f1] px-4 py-3 text-[13px]">
                  Warehouse / pickup option: {order.pickup.address}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn btn--outline" onClick={() => goBack(0)}>
                  Back
                </button>
                <button type="button" className="btn btn--red" onClick={goToPayment}>
                  Continue to payment
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="payment-step">
              <h1 ref={stepHeadingRef} tabIndex={-1} id="payment-step" className="display text-[clamp(28px,4vw,40px)] focus:outline-none">
                Payment
              </h1>

              {stripeEnabled && (
                <div className="surface-card mt-4 p-6">
                  <p className="text-[15px] font-bold">Pay securely by card now</p>
                  <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">
                    Card details are entered on Stripe&apos;s secure checkout page — this site never
                    sees or stores them.
                  </p>
                  <button
                    type="button"
                    className="btn btn--red mt-4"
                    onClick={payByCard}
                    disabled={submitting || redirecting}
                  >
                    {submitting || redirecting
                      ? "Redirecting to secure checkout…"
                      : `Pay ${formatCurrency(subtotal + deliveryFee)} by card`}
                  </button>
                  <p className="checkout-trust mt-3">
                    <span aria-hidden>🔒</span>
                    <span>Secured by Stripe</span>
                    <span className="checkout-trust__sep" aria-hidden />
                    <span>Visa</span>
                    <span>Mastercard</span>
                    <span>Amex</span>
                    <span>Apple&nbsp;Pay</span>
                  </p>
                  <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                    By paying you agree to our{" "}
                    <Link href="/terms" className="underline">
                      terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline">
                      privacy policy
                    </Link>
                    . Payments are processed by Stripe; card data is handled entirely on Stripe&apos;s
                    infrastructure.
                  </p>
                </div>
              )}

              <div className="surface-card mt-4 p-6">
                <p className="text-[15px] font-bold">
                  {stripeEnabled ? "Or submit for invoice" : "Submit your order"}
                </p>
                <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">
                  This site does not take card details online for this option. Submit your order now
                  and the wholesale team confirms stock, final pricing and payment (EFT or card on
                  invoice) before dispatch.
                </p>
                <ul className="mt-4 flex flex-col gap-2 text-[14px] text-[var(--color-text-muted)]">
                  <li>
                    ✓{" "}
                    {details.deliveryMethod === "pickup"
                      ? "Free pickup from Regency Park"
                      : freeDelivery
                        ? "Free Adelaide-wide delivery"
                        : `${formatCurrency(deliveryFee)} Adelaide-wide delivery`}
                  </li>
                  <li>✓ Order reference issued immediately</li>
                  <li>✓ No card data stored by this website</li>
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="btn btn--outline" onClick={() => goBack(1)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className={stripeEnabled ? "btn btn--outline" : "btn btn--red"}
                    onClick={placeOrder}
                    disabled={submitting || redirecting}
                  >
                    {submitting ? "Placing order…" : "Place bulk order"}
                  </button>
                </div>
              </div>

            </section>
          )}

          {step === 3 && confirmation && (
            <section aria-labelledby="confirm-step">
              <div className="surface-card p-8 text-center">
                <span className="pill pill--green">Order received</span>
                <h1 ref={stepHeadingRef} tabIndex={-1} id="confirm-step" className="display mt-4 text-[32px] focus:outline-none">
                  Thanks — your order is in
                </h1>
                <p className="mt-2 text-[var(--color-text-muted)]">
                  Reference <strong className="text-[var(--color-text)]">{confirmation.reference}</strong>.
                  The wholesale team will be in touch to confirm stock, final pricing and
                  payment.
                </p>
                {confirmation.mode === "test" && (
                  <p className="mx-auto mt-3 max-w-md text-[13px] text-[var(--color-text-muted)]">
                    Test checkout: no payment was taken. Pricing and availability are confirmed before dispatch.
                  </p>
                )}
                {!confirmation.notified && (
                  <p className="mx-auto mt-3 max-w-md text-[13px] text-[var(--color-red-deep)]">
                    We recorded your order but the notification email is not configured yet —
                    please also call or email to confirm.
                  </p>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/tyres" className="btn btn--green">
                    Continue shopping
                  </Link>
                  <Link href="/" className="btn btn--outline">
                    Back to home
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>

        {step < 3 && (
          <aside className="lg:sticky lg:top-[calc(var(--header-total)+64px)] lg:self-start">
            <div className="surface-card p-6">
              <h2 className="display text-[22px]">Order summary</h2>
              <dl className="mt-4 flex flex-col gap-3 text-[14px]">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <dt className="text-[var(--color-text-muted)]">{row.label}</dt>
                    <dd className="font-semibold">{row.value}</dd>
                  </div>
                ))}
                <div className="my-1 h-px bg-[var(--color-border)]" />
                <div className="flex justify-between">
                  <dt className="font-bold">Order total</dt>
                  <dd className="commerce-summary-value display text-[18px]" key={subtotal + deliveryFee}>{formatTotal(subtotal + deliveryFee)}</dd>
                </div>
              </dl>
              {freeDelivery ? (
                <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-green)] px-4 py-3 text-white">
                  <p className="text-[13px] font-bold uppercase tracking-wide">
                    Free {details.deliveryMethod === "pickup" ? "warehouse pickup" : "Adelaide delivery"}
                  </p>
                  <p className="text-[12px] text-white/80">No delivery charge on this order.</p>
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] px-4 py-3">
                  <p className="text-[13px] font-bold uppercase tracking-wide">
                    {formatCurrency(deliveryFee)} Adelaide delivery
                  </p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Free from {order.delivery.freeQualifyingTyres} tyres, or choose warehouse pickup.
                  </p>
                </div>
              )}
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                Pricing and availability are confirmed again before dispatch.
              </p>
            </div>
          </aside>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, step }: { children: React.ReactNode; step: CheckoutStepIndex }) {
  return (
    <>
      <CheckoutProgress current={step} />
      <div className="bg-[var(--color-surface-muted)]">
        <div className="container-x py-10">{children}</div>
      </div>
    </>
  );
}

function FulfilmentOption({
  checked,
  onChange,
  title,
  copy,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  copy: string;
}) {
  return (
    <label
      className={`fulfilment-option flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-4 ${
        checked ? "border-[var(--color-green)] bg-[#eef5f1]" : "border-[var(--color-border)] bg-white"
      }`}
    >
      <input type="radio" name="fulfilment" checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-[13px] text-[var(--color-text-muted)]">{copy}</span>
      </span>
    </label>
  );
}
