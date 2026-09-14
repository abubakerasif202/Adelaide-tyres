"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Accessory } from "@/lib/accessories";
import { QuantitySelector } from "./QuantitySelector";
import { PriceDisplay } from "./primitives";

const MAX_ACCESSORY_QUANTITY = 1000;

/** Purchase controls for accessories that are intentionally outside the 247 tyre stock feed. */
export function AccessoryPurchasePanel({ accessory }: { accessory: Accessory }) {
  const { add, cart } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const inCart = cart.lines.find((line) => line.id === accessory.id)?.quantity ?? 0;

  function addToCart() {
    if (!accessory.purchasable) return;
    add({
      id: accessory.id,
      slug: accessory.slug,
      brand: accessory.sku,
      pattern: accessory.name,
      size: accessory.subtitle,
      price: accessory.price,
      image: accessory.image,
      quantity: qty,
    });
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="surface-card p-6" data-testid="purchase-panel">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          Price
        </span>
        <PriceDisplay price={accessory.price} fractionDigits={2} />
      </div>
      <p className="mt-1 text-[13px] font-semibold text-[var(--color-green)]">
        {accessory.purchasable ? "Available to purchase" : "Contact us to order"} · SKU {accessory.sku}
      </p>

      <div className="mt-5 flex items-center gap-3">
        <QuantitySelector
          value={qty}
          onChange={setQty}
          min={1}
          max={MAX_ACCESSORY_QUANTITY}
          disabled={!accessory.purchasable}
          label={`Quantity for ${accessory.name}`}
        />
        <span className="text-[13px] text-[var(--color-text-muted)]">$10.00 each</span>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          className="btn btn--red w-full"
          data-added={added || undefined}
          onClick={addToCart}
          disabled={!accessory.purchasable}
        >
          {!accessory.purchasable ? "Contact to order" : added ? "Added to cart ✓" : `Add ${qty} to cart`}
        </button>
        <button
          type="button"
          className="link-underline inline-flex min-h-[44px] items-center justify-center self-center text-[13px] font-bold uppercase tracking-wide disabled:opacity-50"
          disabled={!accessory.purchasable}
          onClick={() => {
            addToCart();
            window.setTimeout(() => router.push("/cart"), 0);
          }}
        >
          Add &amp; go to cart
        </button>
        <span role="status" className="sr-only">
          {added ? `Added ${qty}. ${inCart + qty} ${inCart + qty === 1 ? "item" : "items"} in cart.` : ""}
        </span>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-[12px] text-[var(--color-text-muted)]">
        <p>Valve quantities do not count toward the tyre quantity used for free-delivery eligibility.</p>
      </div>

      <div className="mt-4 flex justify-center">
        <Link href="/tyres" className="link-underline inline-flex min-h-[44px] items-center text-[13px] font-bold uppercase tracking-wide">
          Back to catalogue
        </Link>
      </div>
    </div>
  );
}
