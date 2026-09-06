"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, pluralTyres } from "@/lib/format";

export function MobileCartBar() {
  const pathname = usePathname();
  const { hydrated, totalTyres, subtotal, minimumMet, tyresRemaining } = useCart();

  if (!hydrated || totalTyres === 0) return null;
  if (pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(9,12,12,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px]">
          <p className="font-bold">{pluralTyres(totalTyres)} · {formatCurrency(subtotal)}</p>
          <p className="text-[var(--color-text-muted)]">
            {minimumMet ? "Minimum met" : `${tyresRemaining} more to checkout`}
          </p>
        </div>
        <Link href={minimumMet ? "/checkout" : "/cart"} className="btn btn--red min-h-[46px] px-5 py-2">
          {minimumMet ? "Checkout" : "View cart"}
        </Link>
      </div>
    </div>
  );
}
