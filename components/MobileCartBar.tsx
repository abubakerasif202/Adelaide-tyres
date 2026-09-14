"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/format";

export function MobileCartBar() {
  const pathname = usePathname();
  const { hydrated, totalItems, totalTyres, subtotal, qualifiesForFreeDelivery, deliveryFee } = useCart();

  const visible =
    hydrated && totalItems > 0 && pathname !== "/cart" && pathname !== "/checkout";

  // The bar is fixed to the bottom of the viewport; without this the last
  // ~70px of every page (footer legal row, last card CTA) sits under it.
  useEffect(() => {
    document.body.classList.toggle("has-cart-bar", visible);
    return () => document.body.classList.remove("has-cart-bar");
  }, [visible]);

  if (!visible) return null;

  const itemLabel = `${totalItems} item${totalItems === 1 ? "" : "s"}`;

  return (
    <div className="mobile-cart-bar lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(9,12,12,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px]">
          <p className="font-bold">{itemLabel} · {formatCurrency(subtotal)}</p>
          <p className="text-[var(--color-text-muted)]">
            {qualifiesForFreeDelivery
              ? "Free delivery"
              : totalTyres > 0
                ? `${formatCurrency(deliveryFee)} delivery`
                : `${formatCurrency(deliveryFee)} delivery · pickup free`}
          </p>
        </div>
        <Link href="/checkout" className="btn btn--red min-h-[46px] px-5 py-2">
          Checkout
        </Link>
      </div>
    </div>
  );
}
