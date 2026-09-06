"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { order } from "@/lib/config";
import type { Tyre } from "@/lib/catalogue";
import { QuantitySelector } from "./QuantitySelector";
import { TyreImage } from "./TyreImage";
import { BadgePill, PriceDisplay, StockBadge, tyreTitle } from "./primitives";

export function ProductCard({ tyre, priority = false }: { tyre: Tyre; priority?: boolean }) {
  const { add } = useCart();
  const [qty, setQty] = useState(Math.min(order.defaultQuantity, Math.max(1, tyre.stock)));
  const [added, setAdded] = useState(false);
  const soldOut = tyre.stock <= 0;

  function handleAdd() {
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
    <article className="surface-card flex flex-col gap-3.5 p-[18px]">
      <div className="flex h-7 items-start justify-between">
        {tyre.badge ? <BadgePill label={tyre.badge} /> : <span />}
        <StockBadge stock={tyre.stock} />
      </div>

      <Link
        href={`/tyres/${tyre.slug}`}
        className="flex items-center gap-[18px] rounded-[10px] focus-visible:outline-offset-4"
      >
        <TyreImage src={tyre.image} alt={tyreTitle(tyre)} size={112} priority={priority} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-red)]">
            {tyre.brand}
          </span>
          <span className="display text-[30px] text-[var(--color-ink)]">{tyre.size}</span>
          <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">
            Pattern {tyre.pattern}
          </span>
        </div>
      </Link>

      <div className="h-px w-full bg-[var(--color-border)]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            Wholesale price
          </span>
          <PriceDisplay price={tyre.price} />
        </div>
        <QuantitySelector
          value={qty}
          onChange={setQty}
          min={1}
          max={tyre.stock || undefined}
          label={`Quantity for ${tyreTitle(tyre)}`}
          size="sm"
        />
      </div>

      <button
        type="button"
        className="btn btn--red w-full"
        onClick={handleAdd}
        disabled={soldOut}
      >
        {soldOut ? "Out of stock" : added ? "Added ✓" : `Add ${qty} to cart`}
      </button>

      <p className="text-[12px] font-medium text-[var(--color-text-muted)]">
        Minimum delivery order: {order.minimumTyres} tyres total.
      </p>
    </article>
  );
}
