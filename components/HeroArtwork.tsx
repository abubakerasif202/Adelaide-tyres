"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";

type HeroTyre = Pick<Tyre, "slug" | "brand" | "pattern" | "size" | "price" | "image">;

/**
 * Front-facing commercial truck wheel, authored as vector and exported to a
 * transparent 1000x1000 WebP (source: `public/images/hero/hero-truck-tyre.svg`).
 * It is dead-centred in its own square canvas, which is what lets the spinner
 * wrapper rotate it about the true axle without wobble.
 *
 * To swap in a photoreal render, replace the file at this path — no code change
 * is needed while it stays 1000x1000. It MUST be shot head-on: a three-quarter
 * product photo has an elliptical silhouette and an off-centre rim, so rotating
 * it tumbles the tyre rather than turning it. Validate first with
 * `npm run check:hero-tyre -- <file>`; the spec is in
 * public/images/hero/README.md.
 */
const HERO_WHEEL = {
  src: "/images/hero/hero-truck-tyre.webp",
  width: 1000,
  height: 1000,
} as const;

export function HeroArtwork({ tyre }: { tyre: HeroTyre }) {
  return (
    <div className="hero__visual relative mx-auto w-full">
      <Link href={`/tyres/${tyre.slug}`} className="hero__bay block focus-visible:outline-offset-4 group">
        <div className="hero__bay-tags">
          <span className="hero__bay-tag">Regency Park warehouse</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7fd1b3] opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 hidden sm:inline-flex items-center gap-1">
            View tyre <span aria-hidden>→</span>
          </span>
        </div>

        {/*
          Three nested wrappers, one transform each — this is deliberate.
          `.hero-tyre-stage` owns layout and the scroll parallax, the entrance
          wrapper owns translate/scale, and only the innermost spinner owns the
          continuous rotation. Stacking entrance + idle spin on a single element
          makes the second animation snap the first one's transform away.
        */}
        <div className="hero-tyre-stage hero__bay-image">
          <span className="hero-tyre-glow" aria-hidden />
          <span className="hero-tyre-rings" aria-hidden>
            <span className="hero-tyre-ring hero-tyre-ring--outer" />
            <span className="hero-tyre-ring hero-tyre-ring--inner" />
          </span>

          <div className="hero-tyre-entrance">
            <div className="hero-tyre-spinner">
              <Image
                src={HERO_WHEEL.src}
                alt=""
                aria-hidden
                width={HERO_WHEEL.width}
                height={HERO_WHEEL.height}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 639px) 74vw, (max-width: 1023px) 70vw, 420px"
                className="hero-tyre-image"
              />
            </div>
          </div>

          <span className="hero-tyre-contact" aria-hidden />
        </div>

        <div className="hero__bay-footer">
          <div>
            <span className="hero__bay-eyebrow">Featured wholesale stock</span>
            <span className="hero__bay-name">
              {tyre.brand} {tyre.pattern} · {tyre.size}
            </span>
          </div>
          <div className="text-right">
            <span className="hero__bay-eyebrow">Wholesale price</span>
            <span className="hero__bay-price">
              {formatCurrency(tyre.price)} <span className="hero__bay-price-note">ea</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
