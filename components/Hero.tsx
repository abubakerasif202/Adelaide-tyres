import Link from "next/link";
import { order } from "@/lib/config";
import { catalogueStats, getTyreBySlug } from "@/lib/catalogue";
import { formatCurrency } from "@/lib/format";
import { HeroArtwork } from "./HeroArtwork";

/** The one product the hero studio bay features. A real, verified catalogue SKU. */
const HERO_TYRE_SLUG = "ralson-rmr61-295-80r22-5";

export function Hero() {
  const tyre = getTyreBySlug(HERO_TYRE_SLUG);

  return (
    <section className="hero on-dark relative isolate overflow-hidden bg-[var(--color-green)] text-white">
      <div className="hero__wash pointer-events-none absolute inset-0 -z-20" aria-hidden />
      <div className="hero__texture pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="homepage-container hero__grid relative grid items-center gap-8 py-12 md:py-24 lg:grid-cols-12">
        <div className="relative z-10">
          <span className="hero__badge">
            <span className="hero__badge-dot" aria-hidden />
            Adelaide wholesale distribution · Regency Park warehouse
          </span>

          <h1 className="hero__title display">
            Wholesale tyres.<br />
            <span>Ready for your next order.</span>
          </h1>

          <p className="hero__copy">
            No minimum order. {formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery
            for 1–{order.delivery.freeQualifyingTyres - 1} tyres. Free Adelaide-wide delivery
            from {order.delivery.freeQualifyingTyres} tyres. Commercial and truck tyres for
            Adelaide workshops, fleets and transport operators.
          </p>

          <div className="hero__actions flex flex-col gap-4 sm:flex-row">
            <Link href="/tyres" className="btn btn--red">
              Shop available stock
            </Link>
            <Link href="/contact?type=quote" className="btn btn--outline-light">
              Get a wholesale quote
            </Link>
          </div>

          <div className="hero__meta grid w-full grid-cols-2 gap-4 border-t border-white/12 sm:grid-cols-3">
            <span className="hero__meta-item">
              <span className="hero__meta-value">No minimum</span>
              <span className="hero__meta-label">Order from one tyre</span>
            </span>
            <span className="hero__meta-item">
              <span className="hero__meta-value">{order.delivery.freeQualifyingTyres}+ free</span>
              <span className="hero__meta-label">Adelaide-wide delivery</span>
            </span>
            <span className="hero__meta-item">
              <span className="hero__meta-value">Direct</span>
              <span className="hero__meta-label">Regency Park pickup</span>
            </span>
          </div>
        </div>

        {tyre && (
          <HeroArtwork
            tyre={tyre}
            units={catalogueStats.unitsListed}
            skuLines={catalogueStats.skuLines}
          />
        )}
      </div>
    </section>
  );
}
