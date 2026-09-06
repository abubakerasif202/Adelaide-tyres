"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { order } from "@/lib/config";
import type { Tyre } from "@/lib/catalogue";
import { tyreFullName } from "@/lib/tyre";
import { QuantitySelector } from "./QuantitySelector";
import { PriceDisplay } from "./primitives";

export function ProductPurchasePanel({ tyre }: { tyre: Tyre }) {
  const { add, totalTyres, minimumMet, tyresRemaining } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(Math.min(order.defaultQuantity, Math.max(1, tyre.stock)));
  const [added, setAdded] = useState(false);
  const soldOut = tyre.stock <= 0;

  function addToCart() {
    add({
      id: tyre.id,
      slug: tyre.slug,
      brand: tyre.brand,
      pattern: tyre.pattern,
      size: tyre.size,
      price: tyre.price,
      stock: tyre.stock,
      image: tyre.image,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
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
          value={qty}
          onChange={setQty}
          min={1}
          max={tyre.stock || undefined}
          label={`Quantity for ${tyreFullName(tyre)}`}
        />
        <span className="text-[13px] text-[var(--color-text-muted)]">
          {order.minimumTyres} tyre minimum per order
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          className="btn btn--red w-full"
          onClick={addToCart}
          disabled={soldOut}
        >
          {soldOut ? "Out of stock" : added ? "Added to cart ✓" : `Add ${qty} to cart`}
        </button>
        <button
          type="button"
          className="btn btn--green w-full"
          disabled={soldOut}
          onClick={() => {
            addToCart();
            router.push("/cart");
          }}
        >
          Add & go to cart
        </button>
      </div>

      <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-4 text-[13px]">
        {minimumMet ? (
          <p className="font-semibold text-[var(--color-green)]">
            ✓ Minimum order met · {totalTyres} tyres in cart · free Adelaide-wide delivery
          </p>
        ) : totalTyres > 0 ? (
          <p className="text-[var(--color-text-muted)]">
            {totalTyres} in cart. Add {tyresRemaining} more{" "}
            {tyresRemaining === 1 ? "tyre" : "tyres"} to qualify for checkout and free
            Adelaide-wide delivery.
          </p>
        ) : (
          <p className="text-[var(--color-text-muted)]">
            Free Adelaide-wide delivery on orders of {order.minimumTyres} tyres or more.
            Mix any products to reach the minimum.
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
