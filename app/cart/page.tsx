"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { QuantitySelector } from "@/components/QuantitySelector";
import { TyreImage } from "@/components/TyreImage";
import { DeliveryStatus } from "@/components/DeliveryStatus";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getLineSubtotal } from "@/lib/cart";
import { formatCurrency, formatTotal } from "@/lib/format";
import { tyreFullName } from "@/lib/tyre";
import { order } from "@/lib/config";

export default function CartPage() {
  const {
    cart,
    hydrated,
    totalTyres,
    subtotal,
    qualifiesForFreeDelivery,
    deliveryFee,
    setQuantity,
    remove,
    clear,
  } = useCart();

  const empty = hydrated && cart.lines.length === 0;

  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x py-10">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Cart", path: "/cart" }]} />
        <h1 className="display mt-4 text-[clamp(30px,5vw,48px)]">Your bulk order</h1>

        {!hydrated ? (
          <p className="mt-8 text-[var(--color-text-muted)]">Loading your cart…</p>
        ) : empty ? (
          <div className="surface-card mt-8 p-10 text-center">
            <h2 className="display text-[24px]">Your cart is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-[var(--color-text-muted)]">
              No minimum order — add any tyres from current stock to start a
              wholesale order.
            </p>
            <Link href="/tyres" className="btn btn--green mt-6">
              Shop available stock
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div>
              <DeliveryStatus
                totalTyres={totalTyres}
                qualifiesForFreeDelivery={qualifiesForFreeDelivery}
                deliveryFee={deliveryFee}
              />

              <ul className="mt-5 flex flex-col gap-4">
                {cart.lines.map((line) => (
                  <li key={line.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]">
                      <TyreImage src={line.image} alt={tyreFullName(line)} size={64} />
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-red)]">
                        {line.brand}
                      </span>
                      <p className="display text-[22px]">{line.size}</p>
                      <p className="text-[13px] text-[var(--color-text-muted)]">
                        Pattern {line.pattern} · {line.stock} in stock
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
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
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                          {formatCurrency(line.price)} ea
                        </p>
                        <p className="display text-[20px]">{formatCurrency(getLineSubtotal(line))}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.id)}
                        className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-red)]"
                        aria-label={`Remove ${tyreFullName(line)} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex justify-between">
                <button type="button" onClick={clear} className="link-underline text-[13px] font-bold uppercase tracking-wide">
                  Clear cart
                </button>
                <Link href="/tyres" className="link-underline text-[13px] font-bold uppercase tracking-wide">
                  Continue shopping
                </Link>
              </div>
            </div>

            <aside className="lg:sticky lg:top-[160px] lg:self-start">
              <div className="surface-card p-6">
                <h2 className="display text-[24px]">Order summary</h2>
                <dl className="mt-4 flex flex-col gap-3 text-[14px]">
                  <Row label="Tyre subtotal" value={formatCurrency(subtotal)} />
                  <Row label="Total tyres" value={String(totalTyres)} />
                  <Row
                    label="Delivery"
                    value={qualifiesForFreeDelivery ? "Free" : formatCurrency(deliveryFee)}
                  />
                  <div className="my-1 h-px bg-[var(--color-border)]" />
                  <Row label="Wholesale pricing" value={order.pricingIsPlaceholder ? "Test pricing" : "Current"} />
                  <Row label="Order total" value={formatTotal(subtotal + deliveryFee)} strong />
                </dl>

                <Link href="/checkout" className="btn btn--red mt-5 w-full">
                  Continue to checkout
                </Link>
                <Link href="/tyres" className="btn btn--outline mt-2.5 w-full">
                  Back to stock
                </Link>
                <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                  Pricing shown is current wholesale pricing from live stock.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-bold" : "text-[var(--color-text-muted)]"}>{label}</dt>
      <dd key={value} className={`commerce-summary-value ${strong ? "display text-[18px]" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}
