"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Accessory } from "@/lib/accessories";
import { useCart } from "@/lib/cart-context";
import { QuantitySelector } from "./QuantitySelector";
import { PriceDisplay } from "./primitives";

const MAX_ACCESSORY_QUANTITY = 1000;

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
    add({
      id: accessory.id,
      slug: accessory.slug,
      kind: "accessory",
      brand: accessory.sku,
      pattern: accessory.name.replace(`${accessory.sku} `, ""),
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
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          Price
        </span>
        <PriceDisplay price={accessory.price} fractionDigits={2} />
      </div>

      <p className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-green)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-green)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-green)]" />
        </span>
        <span>Available to purchase online · SKU {accessory.sku}</span>
      </p>

      <div className="mt-5 flex items-center gap-3">
        <QuantitySelector
          value={qty}
          onChange={setQty}
          min={1}
          max={MAX_ACCESSORY_QUANTITY}
          label={`Quantity for ${accessory.name}`}
        />
        <span className="text-[13px] text-[var(--color-text-muted)]">$10.00 each</span>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          className="btn btn--red w-full"
          data-added={added}
          onClick={addToCart}
        >
          {added ? "Added to cart ✓" : `Add ${qty} to cart`}
        </button>
        <button
          type="button"
          className="link-underline inline-flex min-h-[44px] items-center justify-center self-center text-[13px] font-bold uppercase tracking-wide"
          onClick={() => {
            addToCart();
            window.setTimeout(() => router.push("/cart"), 0);
          }}
        >
          Add &amp; go to cart
        </button>
        <span role="status" className="sr-only">
          {added ? `Added — ${inCart + qty} in cart` : ""}
        </span>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-[13px] text-[var(--color-text-muted)]">
        <p>Secure card payment is available at checkout. Accessories do not count towards the 8+ tyre free-delivery threshold.</p>
      </div>
    </div>
  );
}
