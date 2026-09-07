"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export function HeroArtwork({ units, skuLines }: { units: number; skuLines: number }) {
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
    <div ref={visualRef} className="hero__visual relative mx-auto w-full max-w-[520px]" data-active="true">
      <div className="hero__studio aspect-square overflow-hidden rounded-[28px]">
        <Image
          src="/images/tyres/ralson-rmr61-295-80r22-5.webp"
          alt="Ralson RMR61 295/80R22.5 tyre from current Adelaide stock"
          fill
          preload
          sizes="(max-width: 1023px) min(100vw - 32px, 520px), 42vw"
          className="hero__tyre object-cover"
        />
        <div className="hero__image-shade" aria-hidden />
        <div className="hero__image-colour" aria-hidden />
        <div className="hero__image-vignette" aria-hidden />
        <span className="hero__product-label">Ralson RMR61 · 295/80R22.5</span>
      </div>
      <div className="surface-card absolute -bottom-[26px] left-1/2 min-w-[230px] -translate-x-1/2 rounded-2xl px-6 py-3.5 text-center text-[var(--color-ink)]">
        <span className="display block text-[30px] leading-none">{units}</span>
        <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          units across {skuLines} SKU lines
        </span>
      </div>
    </div>
  );
}
