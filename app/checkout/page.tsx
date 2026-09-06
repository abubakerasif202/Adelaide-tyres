"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { getLineSubtotal } from "@/lib/cart";
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
import { OrderMinimumStatus } from "@/components/OrderMinimumStatus";

export default function CheckoutPage() {
  const { cart, hydrated, totalTyres, subtotal, minimumMet, tyresRemaining, setQuantity, clear } =
    useCart();
  const [step, setStep] = useState<CheckoutStepIndex>(0);
  const [details, setDetails] = useState<CheckoutDetails>(EMPTY_CHECKOUT_DETAILS);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ reference: string; mode: string; notified: boolean } | null>(null);
  const [startedAt] = useState(() => Date.now());

  const freeDelivery = details.deliveryMethod === "pickup" || minimumMet;

  const set = (patch: Partial<CheckoutDetails>) => setDetails((d) => ({ ...d, ...patch }));

  const summaryRows = useMemo(
    () => [
      { label: "Tyres", value: String(totalTyres) },
      { label: "Delivery", value: freeDelivery ? "Free" : "TBC" },
      { label: "Minimum order", value: minimumMet ? "Met" : `${tyresRemaining} to go` },
      { label: "Wholesale pricing", value: order.pricingIsPlaceholder ? "Test pricing" : "Current" },
    ],
    [totalTyres, freeDelivery, minimumMet, tyresRemaining],
  );

  if (hydrated && cart.lines.length === 0 && !confirmation) {
    return (
      <Shell step={0}>
        <div className="surface-card p-10 text-center">
          <h1 className="display text-[26px]">Nothing to check out</h1>
          <p className="mx-auto mt-2 max-w-md text-[var(--color-text-muted)]">
            Add {order.minimumTyres} or more tyres to start a wholesale order.
          </p>
          <Link href="/tyres" className="btn btn--green mt-6">
            Shop available stock
          </Link>
        </div>
      </Shell>
    );
  }

  function goToDelivery() {
    if (!minimumMet) return;
    setStep(1);
  }

  function goToPayment() {
    const found = validateCheckoutDetails(details);
    setErrors(found);
    if (!hasErrors(found)) setStep(2);
    else document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
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
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {step === 0 && (
            <section aria-labelledby="cart-step">
              <h1 id="cart-step" className="display text-[clamp(28px,4vw,40px)]">
                Your bulk order
              </h1>
              <div className="mt-4">
                <OrderMinimumStatus
                  totalTyres={totalTyres}
                  minimumMet={minimumMet}
                  tyresRemaining={tyresRemaining}
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
                      max={line.stock || undefined}
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
              <div className="mt-6 flex gap-3">
                <button type="button" className="btn btn--red" onClick={goToDelivery} disabled={!minimumMet}>
                  {minimumMet ? "Continue to delivery" : `Add ${tyresRemaining} more tyres`}
                </button>
                <Link href="/tyres" className="btn btn--outline">
                  Back to stock
                </Link>
              </div>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="delivery-step">
              <h1 id="delivery-step" className="display text-[clamp(28px,4vw,40px)]">
                Delivery details
              </h1>
              <p className="mt-2 text-[var(--color-text-muted)]">
                Free {business.serviceArea.label} delivery for orders of {order.minimumTyres} or
                more tyres.
              </p>

              <fieldset className="mt-5">
                <legend className="field-label">Fulfilment</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FulfilmentOption
                    checked={details.deliveryMethod === "delivery"}
                    onChange={() => set({ deliveryMethod: "delivery" })}
                    title="Free Adelaide delivery"
                    copy={`${business.serviceArea.description}, orders of ${order.minimumTyres}+ tyres`}
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

              <div className="mt-6 flex gap-3">
                <button type="button" className="btn btn--outline" onClick={() => setStep(0)}>
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
              <h1 id="payment-step" className="display text-[clamp(28px,4vw,40px)]">
                Payment
              </h1>
              <div className="surface-card mt-4 p-6">
                <p className="text-[15px]">
                  This site does not take card details online. Submit your order now and the
                  wholesale team confirms stock, final pricing and payment (EFT or card on
                  invoice) before dispatch.
                </p>
                <ul className="mt-4 flex flex-col gap-2 text-[14px] text-[var(--color-text-muted)]">
                  <li>✓ {details.deliveryMethod === "pickup" ? "Pickup from Regency Park" : "Free Adelaide-wide delivery"}</li>
                  <li>✓ Order reference issued immediately</li>
                  <li>✓ No card data stored by this website</li>
                </ul>
              </div>
              {submitError && (
                <p className="field-error mt-4" role="alert">
                  {submitError}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button type="button" className="btn btn--outline" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="btn btn--red" onClick={placeOrder} disabled={submitting}>
                  {submitting ? "Placing order…" : "Place bulk order"}
                </button>
              </div>
            </section>
          )}

          {step === 3 && confirmation && (
            <section aria-labelledby="confirm-step">
              <div className="surface-card p-8 text-center">
                <span className="pill pill--green">Order received</span>
                <h1 id="confirm-step" className="display mt-4 text-[32px]">
                  Thanks — your order is in
                </h1>
                <p className="mt-2 text-[var(--color-text-muted)]">
                  Reference <strong className="text-[var(--color-text)]">{confirmation.reference}</strong>.
                  The wholesale team will be in touch to confirm stock, final pricing and
                  payment.
                </p>
                {confirmation.mode === "test" && (
                  <p className="mx-auto mt-3 max-w-md text-[13px] text-[var(--color-text-muted)]">
                    Test checkout: no payment was taken and prices are placeholder values.
                  </p>
                )}
                {!confirmation.notified && (
                  <p className="mx-auto mt-3 max-w-md text-[13px] text-[var(--color-red-deep)]">
                    We recorded your order but the notification email is not configured yet —
                    please also call or email to confirm.
                  </p>
                )}
                <div className="mt-6 flex justify-center gap-3">
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
          <aside className="lg:sticky lg:top-[180px] lg:self-start">
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
                  <dd className="display text-[18px]">{formatTotal(subtotal)}</dd>
                </div>
              </dl>
              {freeDelivery && (
                <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-green)] px-4 py-3 text-white">
                  <p className="text-[13px] font-bold uppercase tracking-wide">
                    Free {details.deliveryMethod === "pickup" ? "warehouse pickup" : "Adelaide delivery"}
                  </p>
                  <p className="text-[12px] text-white/80">No delivery charge on this order.</p>
                </div>
              )}
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                Pricing values are placeholder test data from the live store catalogue.
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
      className={`flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-4 ${
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
