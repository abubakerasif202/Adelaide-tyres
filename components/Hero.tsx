import Link from "next/link";
import { order } from "@/lib/config";
import { getTyreBySlug } from "@/lib/catalogue";
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
            Direct wholesale supply for workshops, transport operators, fleet managers and trade
            buyers across Adelaide. Heavy-duty commercial, truck, 4WD and passenger tyres at
            transparent trade rates.
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
              <span className="hero__meta-value">Free {order.delivery.freeQualifyingTyres}+</span>
              <span className="hero__meta-label">Adelaide delivery</span>
            </span>
            <span className="hero__meta-item">
              <span className="hero__meta-value">Direct</span>
              <span className="hero__meta-label">Regency Park depot</span>
            </span>
            <span className="hero__meta-item">
              <span className="hero__meta-value">Trade ABN</span>
              <span className="hero__meta-label">Transparent pricing</span>
            </span>
          </div>
        </div>

        {tyre && <HeroArtwork tyre={tyre} />}
      </div>
    </section>
  );
}
