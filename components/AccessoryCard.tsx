import Link from "next/link";
import Image from "next/image";
import type { Accessory } from "@/lib/accessories";
import { ACCESSORY_CATEGORY_LABELS } from "@/lib/accessories";
import { PriceDisplay } from "./primitives";

/** Enquiry link carrying the SKU so the contact form arrives pre-filled. */
export function accessoryEnquiryHref(accessory: Accessory): string {
  return `/contact?type=quote&product=${encodeURIComponent(accessory.name)}`;
}

/**
 * Catalogue card for a non-tyre accessory. Mirrors the compact ProductCard
 * frame while keeping accessory inventory separate from the 247 tyre feed.
 */
export function AccessoryCard({ accessory }: { accessory: Accessory }) {
  const href = `/accessories/${accessory.slug}`;
  return (
    <article className="surface-card product-card flex flex-col gap-3.5 p-0" data-testid="accessory-card">
      <Link href={href} className="product-card__media focus-visible:outline-offset-[-3px]">
        <Image
          src={accessory.image}
          alt={accessory.imageAlt}
          fill
          sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1024px) 45vw, 300px"
          className="product-card__media-contain"
        />
        <span className="product-card__stock-pill">
          <span className={accessory.purchasable ? "pill pill--green" : "pill pill--muted"}>
            {accessory.purchasable ? "Buy online" : "Enquire to order"}
          </span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3.5 px-[18px] pb-[18px]">
        <Link href={href} className="flex flex-col gap-0.5 rounded-[8px]">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">
            {ACCESSORY_CATEGORY_LABELS[accessory.category]}
          </span>
          <span className="display text-[clamp(25px,2.3vw,30px)] leading-none text-[var(--color-ink)]">{accessory.name}</span>
          <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">{accessory.subtitle}</span>
        </Link>

        <div className="h-px w-full bg-[var(--color-border)]" />

        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Price
            </span>
            <PriceDisplay price={accessory.price} fractionDigits={2} />
          </div>
          <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">SKU {accessory.sku}</span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2.5">
          <Link href={href} className="btn btn--outline">View product</Link>
          {accessory.purchasable ? (
            <Link href={href} className="btn btn--red">Buy online</Link>
          ) : (
            <Link href={accessoryEnquiryHref(accessory)} className="btn btn--red">Enquire</Link>
          )}
        </div>
      </div>
    </article>
  );
}
