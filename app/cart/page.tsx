"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { LineQuantitySelector } from "@/components/LineQuantitySelector";
import { TyreImage } from "@/components/TyreImage";
import { DeliveryStatus } from "@/components/DeliveryStatus";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StockBadge } from "@/components/primitives";
import { getLineSubtotal } from "@/lib/cart";
import { getAccessoryBySlug } from "@/lib/accessories";
import { useInventoryAvailability } from "@/lib/inventory/availability-context";
import { formatCurrency, formatTotal } from "@/lib/format";
import { tyreFullName } from "@/lib/tyre";
import { order } from "@/lib/config";

export default function CartPage() {
  const {
    cart,
    hydrated,
    totalItems,
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
              No minimum order — add tyres or accessories from the catalogue to start an order.
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
                {cart.lines.map((line) => {
                  const accessory = getAccessoryBySlug(line.slug);
                  const displayName = accessory?.name ?? tyreFullName(line);
                  return (
                    <li key={line.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]">
                        <TyreImage src={line.image} alt={accessory?.imageAlt ?? displayName} size={64} />
                      </div>
                      <div className="min-w-[140px] flex-1">
                        <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-red)]">
                          {accessory ? `SKU ${accessory.sku}` : line.brand}
                        </span>
                        <p className="display text-[22px]">{accessory?.name ?? line.size}</p>
                        <p className="text-[13px] text-[var(--color-text-muted)]">
                          {accessory ? accessory.subtitle : `Pattern ${line.pattern}`}
                        </p>
                        {!accessory && (
                          <p className="mt-1">
                            <CartLineStock slug={line.slug} />
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <LineQuantitySelector
                          slug={line.slug}
                          value={line.quantity}
                          onChange={(q) => setQuantity(line.id, q)}
                          label={`Quantity for ${displayName}`}
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
                          aria-label={`Remove ${displayName} from cart`}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
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

            <aside className="lg:sticky lg:top-[calc(var(--header-total)+44px)] lg:self-start">
              <div className="surface-card p-6">
                <h2 className="display text-[24px]">Order summary</h2>
                <dl className="mt-4 flex flex-col gap-3 text-[14px]">
                  <Row label="Order subtotal" value={formatCurrency(subtotal)} />
                  <Row label="Total items" value={String(totalItems)} />
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
                  Tyre availability is confirmed again at checkout. Accessories remain separate from tyre delivery thresholds.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function CartLineStock({ slug }: { slug: string }) {
  const availability = useInventoryAvailability(slug);
  return <StockBadge stock={availability.available} state={availability.state} />;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-bold" : "text-[var(--color-text-muted)]"}>{label}</dt>
      <dd key={value} className={`commerce-summary-value ${strong ? "display text-[18px]" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}
