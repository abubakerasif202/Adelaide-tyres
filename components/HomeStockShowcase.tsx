"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { order } from "@/lib/config";
import { deliveryRuleSummary } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";
import { QuantitySelector } from "./QuantitySelector";
import { TyreImage } from "./TyreImage";
import { PriceDisplay, StockBadge, tyreTitle } from "./primitives";

/**
 * Editorial homepage stock showcase: one large featured tyre plus a compact
 * supporting list, not a uniform grid of identical cards. The purpose is to
 * demonstrate real current stock and drive traffic into the full catalogue,
 * not to reproduce /tyres.
 */
export function HomeStockShowcase({ lead, supporting }: { lead: Tyre; supporting: Tyre[] }) {
  return (
    <div className="stock-showcase mt-10 grid gap-6 md:mt-12 lg:grid-cols-[1.55fr_1fr] lg:gap-8">
      <LeadTyre tyre={lead} />

      <div className="flex flex-col gap-4">
        {supporting.map((tyre) => (
          <SupportingTyre key={tyre.id} tyre={tyre} />
        ))}

        <Link href="/tyres" className="stock-showcase__catalogue-cta">
          <span>
            <span className="display block text-[19px]">View full catalogue</span>
            <span className="block text-[13px] text-white/68">
              Every listed size, brand and application
            </span>
          </span>
          <span className="stock-showcase__catalogue-arrow" aria-hidden>
            &#8594;
          </span>
        </Link>
      </div>
    </div>
  );
}

function LeadTyre({ tyre }: { tyre: Tyre }) {
  const { add, cart } = useCart();
  const [qty, setQty] = useState(Math.min(order.defaultQuantity, Math.max(1, tyre.stock)));
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const remainingStock = Math.max(0, tyre.stock - (cart.lines.find((l) => l.id === tyre.id)?.quantity ?? 0));
  const soldOut = tyre.stock <= 0;
  const atStockLimit = remainingStock === 0;
  const selectedQty = Math.min(qty, Math.max(1, remainingStock));
  const title = tyreTitle(tyre);

  function handleAdd() {
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
    <article className="stock-showcase__lead surface-card overflow-hidden">
      <Link href={`/tyres/${tyre.slug}`} className="stock-showcase__lead-media focus-visible:outline-offset-[-3px]">
        {tyre.image ? (
          <Image
            src={tyre.image}
            alt={title}
            fill
            priority
            sizes="(max-width: 1023px) calc(100vw - 32px), 58vw"
            className="stock-showcase__lead-image"
          />
        ) : (
          <TyreImage src={null} alt={title} size={220} />
        )}
        <span className="stock-showcase__lead-pill"><StockBadge stock={tyre.stock} /></span>
        <span className="stock-showcase__lead-tag">Featured this week</span>
      </Link>

      <div className="flex flex-col gap-4 p-6 md:p-8">
        <Link href={`/tyres/${tyre.slug}`} className="flex flex-col gap-1">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">
            {tyre.brand}
          </span>
          <span className="display text-[clamp(30px,3.2vw,40px)] leading-none text-[var(--color-ink)]">
            {tyre.size}
          </span>
          <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">
            Pattern {tyre.pattern}
          </span>
        </Link>

        <p className="max-w-lg text-[14px] text-[var(--color-text-muted)]">{tyre.description}</p>

        <div className="h-px w-full bg-[var(--color-border)]" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Wholesale price
            </span>
            <PriceDisplay price={tyre.price} />
          </div>
          <QuantitySelector
            value={selectedQty}
            onChange={setQty}
            min={1}
            max={Math.max(1, remainingStock)}
            disabled={atStockLimit}
            label={`Quantity for ${title}`}
          />
        </div>

        <button
          type="button"
          className="btn btn--red w-full"
          data-added={added}
          aria-live="polite"
          onClick={handleAdd}
          disabled={soldOut || atStockLimit}
        >
          {soldOut ? "Out of stock" : added ? "Added ✓" : atStockLimit ? "All stock in cart" : `Add ${selectedQty} to cart`}
        </button>
        <p className="text-[12px] font-medium text-[var(--color-text-muted)]">{deliveryRuleSummary("card")}</p>
      </div>
    </article>
  );
}

function SupportingTyre({ tyre }: { tyre: Tyre }) {
  const { add, cart } = useCart();
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const remainingStock = Math.max(0, tyre.stock - (cart.lines.find((l) => l.id === tyre.id)?.quantity ?? 0));
  const soldOut = tyre.stock <= 0;
  const atStockLimit = remainingStock === 0;
  const title = tyreTitle(tyre);

  function handleAdd() {
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
      quantity: 1,
    });
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1000);
  }

  return (
    <article className="stock-showcase__row surface-card">
      <Link href={`/tyres/${tyre.slug}`} className="stock-showcase__row-media focus-visible:outline-offset-[-3px]">
        {tyre.image ? (
          <Image
            src={tyre.image}
            alt={title}
            fill
            sizes="112px"
            className="stock-showcase__row-image"
          />
        ) : (
          <TyreImage src={null} alt={title} size={64} />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 py-1">
        <Link href={`/tyres/${tyre.slug}`} className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-red)]">
            {tyre.brand}
          </span>
          <span className="display block truncate text-[19px] leading-tight text-[var(--color-ink)]">
            {tyre.size}
          </span>
          <span className="block truncate text-[12px] font-semibold text-[var(--color-text-muted)]">
            Pattern {tyre.pattern}
          </span>
        </Link>
        <StockBadge stock={tyre.stock} />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <PriceDisplay price={tyre.price} />
        <button
          type="button"
          className="stock-showcase__row-add"
          data-added={added}
          aria-live="polite"
          onClick={handleAdd}
          disabled={soldOut || atStockLimit}
        >
          {soldOut ? "Sold out" : added ? "Added ✓" : "Add 1"}
        </button>
      </div>
    </article>
  );
}
