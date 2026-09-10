"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { order } from "@/lib/config";
import { deliveryRuleSummary } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";
import { QuantitySelector } from "./QuantitySelector";
import { TyreImage } from "./TyreImage";
import { PriceDisplay, StockBadge, tyreTitle } from "./primitives";

export function ProductCard({
  tyre,
  priority = false,
  variant = "compact",
  lead = false,
}: {
  tyre: Tyre;
  priority?: boolean;
  variant?: "compact" | "feature" | "homepage";
  /** The wide, editorially-weighted lead card (spans 2 grid columns on desktop). */
  lead?: boolean;
}) {
  const { add, cart } = useCart();
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

  if (variant === "feature") {
    const title = tyreTitle(tyre);
    // Only the Ralson hero photo is a wide studio shot meant to bleed edge to
    // edge; every other verified photo (tracked in docs/product-image-manifest.json)
    // gets a contained treatment so it isn't cropped.
    const isRalsonHeroPhoto = tyre.id === "ralson-rmr61-29580r225";

    return (
      <article
        className={`surface-card product-card product-card--feature flex h-full flex-col overflow-hidden ${lead ? "is-lead" : ""}`}
      >
        <Link href={`/tyres/${tyre.slug}`} className={`product-card__media focus-visible:outline-offset-[-3px] ${isRalsonHeroPhoto ? "product-card__media--dark-bay" : ""}`}>
          {tyre.image ? (
            <Image
              src={tyre.image}
              alt={title}
              fill
              priority={priority}
              sizes={
                lead
                  ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, 800px"
                  : "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, 400px"
              }
              className={isRalsonHeroPhoto ? "product-card__media-cover" : "product-card__media-contain"}
            />
          ) : (
            <TyreImage src={null} alt={title} size={190} className="product-card__placeholder" />
          )}
          <span className="product-card__stock-pill"><StockBadge stock={tyre.stock} /></span>
        </Link>

        <div className="flex flex-1 flex-col gap-3.5 px-5 pb-5 pt-[18px]">
          <Link href={`/tyres/${tyre.slug}`} className="flex flex-col gap-0.5 rounded-lg">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">{tyre.brand}</span>
            <span className="display text-[clamp(28px,2.4vw,34px)] leading-none text-[var(--color-ink)]">{tyre.size}</span>
            <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">Pattern {tyre.pattern}</span>
          </Link>
          <div className="h-px w-full bg-[#e2e5e1]" />
          <div className="flex flex-wrap items-end justify-between gap-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Wholesale price</span>
              <PriceDisplay price={tyre.price} />
            </div>
            <QuantitySelector value={selectedQty} onChange={setQty} min={1} max={Math.max(1, remainingStock)} disabled={atStockLimit} label={`Quantity for ${title}`} size="sm" />
          </div>
          <button type="button" className="btn btn--red w-full" data-added={added} aria-live="polite" onClick={handleAdd} disabled={soldOut || atStockLimit}>
            {soldOut ? "Out of stock" : added ? "Added ✓" : atStockLimit ? "All stock in cart" : `Add ${selectedQty} to cart`}
          </button>
          <p className="mt-auto text-[12px] font-medium text-[var(--color-text-muted)]">{deliveryRuleSummary("card")}</p>
        </div>
      </article>
    );
  }

  const compactTitle = tyreTitle(tyre);

  if (variant === "homepage") {
    return (
      <article className="homepage-product-card">
        <Link href={`/tyres/${tyre.slug}`} className="product-card__media">
          {tyre.image ? <Image src={tyre.image} alt={compactTitle} fill priority={priority} sizes="(max-width:639px) calc(100vw - 32px), (max-width:1023px) 50vw, 300px" className="product-card__media-contain" /> : <TyreImage src={null} alt={compactTitle} size={124} />}
          <span className="product-card__stock-pill"><StockBadge stock={tyre.stock} /></span>
        </Link>
        <div className="homepage-product-card__body">
          <div>
            <span className="homepage-product-card__brand">{tyre.brand} · {APPLICATION_LABEL(tyre.application)}</span>
            <Link href={`/tyres/${tyre.slug}`} className="display homepage-product-card__title">{tyre.pattern}</Link>
            <span className="homepage-product-card__size">{tyre.size}</span>
          </div>
          <div className="homepage-product-card__purchase">
            <PriceDisplay price={tyre.price} />
            <div className="homepage-product-card__actions">
              <QuantitySelector value={selectedQty} onChange={setQty} min={1} max={Math.max(1, remainingStock)} disabled={atStockLimit} label={`Quantity for ${compactTitle}`} size="sm" />
              <button type="button" className="btn btn--red" data-added={added} aria-live="polite" onClick={handleAdd} disabled={soldOut || atStockLimit}>{soldOut ? "Out of stock" : added ? "Added ✓" : atStockLimit ? "All stock in cart" : "Add to order"}</button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="surface-card product-card flex flex-col gap-3.5 p-0">
      <Link href={`/tyres/${tyre.slug}`} className="product-card__media focus-visible:outline-offset-[-3px]">
        {tyre.image ? (
          <Image
            src={tyre.image}
            alt={compactTitle}
            fill
            priority={priority}
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1024px) 45vw, 300px"
            className="product-card__media-contain"
          />
        ) : (
          <TyreImage src={null} alt={compactTitle} size={124} className="product-card__placeholder" />
        )}
        <span className="product-card__stock-pill"><StockBadge stock={tyre.stock} /></span>
      </Link>

      <div className="flex flex-1 flex-col gap-3.5 px-[18px] pb-[18px]">
        <Link href={`/tyres/${tyre.slug}`} className="flex flex-col gap-0.5 rounded-[8px]">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">
            {tyre.brand}
          </span>
          <span className="display text-[clamp(25px,2.3vw,30px)] text-[var(--color-ink)]">{tyre.size}</span>
          <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">
            Pattern {tyre.pattern}
          </span>
        </Link>

        <div className="h-px w-full bg-[var(--color-border)]" />

        <div className="flex flex-wrap items-end justify-between gap-3.5">
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
            label={`Quantity for ${compactTitle}`}
            size="sm"
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

        <p className="text-[12px] font-medium text-[var(--color-text-muted)]">
          {deliveryRuleSummary("card")}
        </p>
      </div>
    </article>
  );
}

function APPLICATION_LABEL(application: Tyre["application"]) {
  return application.replace("-", " ");
}
