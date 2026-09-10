"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
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
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      visual.dataset.active = entry?.isIntersecting ? "true" : "false";
    });
    observer.observe(visual);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={visualRef} className="hero__visual relative mx-auto w-full max-w-[560px]" data-active="true">
      <Link href={`/tyres/${tyre.slug}`} className="hero__bay block focus-visible:outline-offset-4">
        <div className="hero__bay-tags">
          <span className="hero__bay-tag">Regency Park warehouse</span>
          <span className="hero__bay-tag hero__bay-tag--muted">
            {units} units · {skuLines} SKU lines
          </span>
        </div>

        <div className="hero__bay-image relative">
          {tyre.image && (
            <Image
              src={tyre.image}
              alt={`${tyre.brand} ${tyre.pattern} ${tyre.size} from current Adelaide stock`}
              fill
              priority
              sizes="(max-width: 1023px) min(100vw - 32px, 560px), 46vw"
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
