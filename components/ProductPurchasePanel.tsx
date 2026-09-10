"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";
import { tyreFullName } from "@/lib/tyre";
import { DeliveryStatus } from "./DeliveryStatus";
import { QuantitySelector } from "./QuantitySelector";
import { PriceDisplay } from "./primitives";

export function ProductPurchasePanel({ tyre }: { tyre: Tyre }) {
  const { add, cart, totalTyres, qualifiesForFreeDelivery, deliveryFee } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(Math.min(order.defaultQuantity, Math.max(1, tyre.stock)));
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);
  // Derived from lib/config.ts, never a literal: the fee beside this range
  // was already config-driven, the range itself was not.
  const paidDeliveryRange = `1–${order.delivery.freeQualifyingTyres - 1}`;
  const remainingStock = Math.max(0, tyre.stock - (cart.lines.find((line) => line.id === tyre.id)?.quantity ?? 0));
  const soldOut = tyre.stock <= 0;
  const atStockLimit = remainingStock === 0;
  const selectedQty = Math.min(qty, Math.max(1, remainingStock));

  function addToCart() {
    if (atStockLimit) return;
    add({
      id: tyre.id,
      slug: tyre.slug,
      brand: tyre.brand,
      pattern: tyre.pattern,
      size: tyre.size,
      price: tyre.price,
      stock: tyre.stock,
      image: tyre.image,
      quantity: selectedQty,
    });
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1000);
  }

  return (
    <div className="surface-card p-6" data-testid="purchase-panel">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          Wholesale price
        </span>
        <PriceDisplay price={tyre.price} />
      </div>

      <p className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-green)]">
        {!soldOut && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-green)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-green)]" />
          </span>
        )}
        <span>{soldOut ? "Currently out of stock" : `${tyre.stock} in stock now`}</span>
      </p>

      <div className="mt-5 flex items-center gap-3">
        <QuantitySelector
          value={selectedQty}
          onChange={setQty}
          min={1}
          max={Math.max(1, remainingStock)}
          disabled={atStockLimit}
          label={`Quantity for ${tyreFullName(tyre)}`}
        />
        <span className="text-[13px] text-[var(--color-text-muted)]">No minimum order</span>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          className="btn btn--red w-full"
          data-added={added}
          aria-live="polite"
          onClick={addToCart}
          disabled={soldOut || atStockLimit}
        >
          {soldOut ? "Out of stock" : added ? "Added to cart ✓" : atStockLimit ? "All stock in cart" : `Add ${selectedQty} to cart`}
        </button>
        <button
          type="button"
          className="btn btn--green w-full"
          disabled={soldOut || atStockLimit}
          onClick={() => {
            addToCart();
            // Let the cart context commit before navigation so the destination
            // never races the just-added line (especially on mobile WebKit).
            window.setTimeout(() => router.push("/cart"), 0);
          }}
        >
          Add & go to cart
        </button>
      </div>

      <div className="mt-5 border-y border-[var(--color-border)] py-4 text-[13px]">
        <p className="font-bold text-[var(--color-green)]">NO MINIMUM ORDER</p>
        <dl className="mt-2 flex flex-col gap-1.5">
          <div className="flex justify-between gap-3"><dt>{paidDeliveryRange} tyres</dt><dd className="font-semibold">{formatCurrency(order.delivery.feeAud)} delivery</dd></div>
          <div className="flex justify-between gap-3"><dt>{order.delivery.freeQualifyingTyres}+ tyres</dt><dd className="font-semibold text-[var(--color-green)]">FREE delivery</dd></div>
          <div className="flex justify-between gap-3"><dt>Warehouse pickup</dt><dd className="font-semibold text-[var(--color-green)]">FREE</dd></div>
        </dl>
        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">Adelaide-wide delivery</p>
      </div>

      <div className="mt-4">
        <DeliveryStatus
          totalTyres={totalTyres}
          qualifiesForFreeDelivery={qualifiesForFreeDelivery}
          deliveryFee={deliveryFee}
        />
      </div>

      <Link
        href="/contact?type=quote"
        className="mt-4 flex min-h-[44px] items-center justify-center text-center text-[13px] font-bold uppercase tracking-wide link-underline"
      >
        Need volume pricing? Request a wholesale quote
      </Link>
    </div>
  );
}
