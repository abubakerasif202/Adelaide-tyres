import Link from "next/link";

import { Reveal } from "./Reveal";
import { WarehouseLocation } from "./WarehouseLocation";

/**
 * `motion="strong"` opts this shared band into the homepage's bolder entrance
 * vocabulary. Every other route keeps the default, subtler reveal.
 */
export function FreeDeliveryCTA({ motion }: { motion?: "strong" } = {}) {
  const ctaVariant = motion === "strong" ? "rise stagger" : undefined;
  return (
    <>
    <WarehouseLocation motion={motion} />
    <section className="homepage-final-cta on-dark">
      <Reveal variant={ctaVariant} className="homepage-container flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div>
            <p className="eyebrow text-[#7fd1b3]">Commercial &amp; wholesale supply</p>
            <h2 className="display mt-1 text-[28px]">Find the right tyres for your next order.</h2>
            <p className="mt-1 text-[14px] text-white/70">Order from verified catalogue stock or request a wholesale quote.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/tyres" className="btn btn--red group">
              <span>Start bulk order</span>
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
            <Link href="/contact" className="btn btn--outline-light group">
              <span>Contact wholesale team</span>
              <span className="inline-block text-white/70 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white" aria-hidden="true">→</span>
            </Link>
          </div>
      </Reveal>
    </section>
    </>
  );
}
