"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";

type HeroTyre = Pick<Tyre, "slug" | "brand" | "pattern" | "size" | "price" | "image">;

export function HeroArtwork({
  tyre,
  units,
  skuLines,
}: {
  tyre: HeroTyre;
  units: number;
  skuLines: number;
}) {
  return (
    <div className="hero__visual relative mx-auto w-full">
      <Link href={`/tyres/${tyre.slug}`} className="hero__bay block focus-visible:outline-offset-4">
        <div className="hero__bay-tags">
          <span className="hero__bay-tag">Regency Park warehouse</span>
        </div>

        <div className="hero__bay-image relative">
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
            <span className="hero__bay-eyebrow">Featured wholesale stock · {units} units / {skuLines} lines</span>
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
