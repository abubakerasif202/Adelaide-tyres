"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { order } from "@/lib/config";
import { formatCurrency, pluralTyres } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";
import { tyreFullName } from "@/lib/tyre";
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

      <p className="mt-1 text-[13px] font-semibold text-[var(--color-green)]">
        {soldOut ? "Currently out of stock" : `${tyre.stock} in stock now`}
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
            router.push("/cart");
          }}
        >
          Add & go to cart
        </button>
      </div>

      <div className="mt-5 border-y border-[var(--color-border)] py-4 text-[13px]">
        <p className="font-bold text-[var(--color-green)]">NO MINIMUM ORDER</p>
        <dl className="mt-2 flex flex-col gap-1.5">
          <div className="flex justify-between gap-3"><dt>1–7 tyres</dt><dd className="font-semibold">{formatCurrency(order.delivery.feeAud)} delivery</dd></div>
          <div className="flex justify-between gap-3"><dt>{order.delivery.freeQualifyingTyres}+ tyres</dt><dd className="font-semibold text-[var(--color-green)]">FREE delivery</dd></div>
          <div className="flex justify-between gap-3"><dt>Warehouse pickup</dt><dd className="font-semibold text-[var(--color-green)]">FREE</dd></div>
        </dl>
        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">Adelaide-wide delivery</p>
      </div>

      <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-4 text-[13px]">
        {qualifiesForFreeDelivery ? (
          <p className="font-semibold text-[var(--color-green)]">
            ✓ {pluralTyres(totalTyres)} in cart · free Adelaide-wide delivery
          </p>
        ) : totalTyres > 0 ? (
          <p className="text-[var(--color-text-muted)]">
            {pluralTyres(totalTyres)} in cart · {formatCurrency(deliveryFee)} Adelaide-wide
            delivery. Add {order.delivery.freeQualifyingTyres - totalTyres} more to make delivery
            free.
          </p>
        ) : (
          <p className="text-[var(--color-text-muted)]">
            No minimum order. {formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery under{" "}
            {order.delivery.freeQualifyingTyres} tyres, free from {order.delivery.freeQualifyingTyres}{" "}
            tyres up.
          </p>
        )}
      </div>

      <Link
        href="/contact?type=quote"
        className="mt-4 block text-center text-[13px] font-bold uppercase tracking-wide link-underline"
      >
        Need volume pricing? Request a wholesale quote
      </Link>
    </div>
  );
}
