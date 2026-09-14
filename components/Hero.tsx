import Link from "next/link";
import { order } from "@/lib/config";
import { getTyreBySlug } from "@/lib/catalogue";
import { HeroArtwork } from "./HeroArtwork";

/** The one product the hero studio bay features. A real, verified catalogue SKU. */
const HERO_TYRE_SLUG = "ralson-rmr61-295-80r22-5";

const ICONS = {
  truck: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 6h11v10H2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  warehouse: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 10 12 4l9 6v9H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 19v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  verified: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l2.4 1.7 2.9-.2.9 2.8 2.3 1.8-1.3 2.6 1.3 2.6-2.3 1.8-.9 2.8-2.9-.2L12 21l-2.4-1.7-2.9.2-.9-2.8-2.3-1.8L4.8 12 3.5 9.4l2.3-1.8.9-2.8 2.9.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
} as const;

const META = [
  { icon: "truck", value: `Free ${order.delivery.freeQualifyingTyres}+`, label: "Adelaide delivery" },
  { icon: "warehouse", value: "Direct", label: "Regency Park depot" },
  { icon: "verified", value: "Trade ABN", label: "Transparent pricing" },
] as const satisfies readonly { icon: keyof typeof ICONS; value: string; label: string }[];

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
            <span className="hero__title-line">
              <span className="hero__title-phrase">Wholesale tyres.</span>
            </span>
            <span className="hero__title-line">
              <span className="hero__title-phrase hero__title-accent">Ready for your next order.</span>
            </span>
          </h1>

          <p className="hero__copy">
            Direct wholesale supply for workshops, transport operators, fleet managers and trade
            buyers across Adelaide. Heavy-duty commercial, truck, 4WD and passenger tyres at
            transparent trade rates.
          </p>

          <div className="hero__actions flex flex-col gap-4 sm:flex-row">
            <Link href="/tyres" className="btn btn--red group">
              <span>Shop available stock</span>
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
            <Link href="/contact?type=quote" className="btn btn--outline-light group">
              <span>Get a wholesale quote</span>
              <span className="inline-block text-white/70 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white" aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="hero__meta grid w-full grid-cols-2 gap-4 border-t border-white/12 sm:grid-cols-3">
            {META.map((item) => (
              <span key={item.value} className="hero__meta-item">
                <span className="hero__meta-icon" aria-hidden>{ICONS[item.icon]}</span>
                <span className="hero__meta-text">
                  <span className="hero__meta-value">{item.value}</span>
                  <span className="hero__meta-label">{item.label}</span>
                </span>
              </span>
            ))}
          </div>
        </div>

        {tyre && <HeroArtwork tyre={tyre} />}
      </div>
    </section>
  );
}
