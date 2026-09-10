import Link from "next/link";
import { business, maps, order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { Reveal } from "./Reveal";

const ICONS = {
  pin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  warehouse: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 10 12 4l9 6v9H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 19v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  truck: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 6h11v10H2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
} as const;

/**
 * Warehouse location band.
 *
 * Every fact here comes from `lib/config.ts` — there is one canonical address
 * for the business and this section reads it rather than restating it. Opening
 * hours are deliberately absent: none are held in project data, and inventing
 * them on a page that tells trade buyers when to turn up would be worse than
 * omitting them.
 */
export function LocationSection() {
  const { address } = business;

  return (
    <section id="location" className="location-band">
      <Reveal variant="rise stagger" className="homepage-container location-band__grid">
        <div className="location-info">
          <p className="eyebrow location-band__eyebrow">
            <span className="location-band__eyebrow-icon" aria-hidden>{ICONS.pin}</span>
            Regency Park, Adelaide
          </p>
          <h2 className="display location-info__title">{business.name}</h2>

          <address className="location-address">
            <span className="location-address__line">{address.street}</span>
            <span className="location-address__line">
              {address.suburb} {address.state} {address.postcode}
            </span>
            <span className="location-address__country">{address.country}</span>
          </address>

          <dl className="location-facts">
            <div className="location-fact">
              <dt><span aria-hidden>{ICONS.warehouse}</span>{order.pickup.label}</dt>
              <dd>Free collection direct from the Regency Park warehouse.</dd>
            </div>
            <div className="location-fact">
              <dt><span aria-hidden>{ICONS.truck}</span>Adelaide-wide delivery</dt>
              <dd>
                {formatCurrency(order.delivery.feeAud)} under {order.delivery.freeQualifyingTyres} tyres,
                free from {order.delivery.freeQualifyingTyres} tyres up.
              </dd>
            </div>
          </dl>

          <div className="location-actions">
            <a
              className="btn btn--green group"
              href={maps.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Get directions</span>
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>→</span>
            </a>
            <Link href="/contact" className="btn btn--outline">Contact the warehouse</Link>
          </div>
        </div>

        <div className="location-map">
          <div className="location-map__head">
            <span className="location-map__pin" aria-hidden>{ICONS.pin}</span>
            <span>{address.oneLine}</span>
          </div>
          {/* Below the fold, so it may lazy-load. The frame reserves its own
              height via aspect-ratio / min-height, so nothing shifts when the
              iframe finally paints. */}
          <div className="location-map__frame">
            <iframe
              src={maps.embedUrl}
              title={`Google Map showing ${business.name} at ${address.oneLine}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
