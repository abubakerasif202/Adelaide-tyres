"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";

type HeroTyre = Pick<Tyre, "slug" | "brand" | "pattern" | "size" | "price" | "image">;

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

        <div className="hero__bay-image relative">
          <span className="hero__bay-wheel" aria-hidden>
            <span className="hero__bay-wheel-ring hero__bay-wheel-ring--outer" />
            <span className="hero__bay-wheel-ring hero__bay-wheel-ring--inner" />
          </span>
          {tyre.image && (
            <Image
              src={tyre.image}
              alt={`${tyre.brand} ${tyre.pattern} ${tyre.size} from current Adelaide stock`}
              fill
              priority
              sizes="(max-width: 1023px) calc(100vw - 32px), 500px"
              className="hero__bay-tyre object-contain"
            />
          )}
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
