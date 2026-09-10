import Link from "next/link";
import { business, maps, order } from "@/lib/config";
import { deliveryRuleSummary, formatCurrency } from "@/lib/format";
import { Reveal } from "./Reveal";

/**
 * Warehouse and delivery hub.
 *
 * Every fact is derived from `lib/config.ts` — the address, the delivery
 * thresholds and both map URLs. Nothing here restates the street literally,
 * so there is one source of truth for where the business is.
 *
 * This replaced a decorative radar-style graphic that stood in for a map. It
 * is a real embed now: a placeholder diagram on a page whose whole job is
 * telling trade buyers where to collect stock was actively unhelpful.
 */

const ICONS = {
  pin: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 6h11v10H2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  tyre: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v5.4M12 15.6V21M3 12h5.4M15.6 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warehouse: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 10 12 4l9 6v9H3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 19v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
} as const;

export function WarehouseLocation({ motion }: { motion?: "strong" } = {}) {
  const { address } = business;
  const { feeAud, freeQualifyingTyres } = order.delivery;
  const paidTier = `1–${freeQualifyingTyres - 1} tyres`;
  const freeTier = `${freeQualifyingTyres}+ tyres`;

  const facts = [
    { icon: "pin", term: "Physical warehouse", detail: `${address.street}, ${address.suburb} ${address.state} ${address.postcode}` },
    { icon: "truck", term: "Adelaide-wide delivery", detail: `${paidTier} · ${formatCurrency(feeAud)}` },
    { icon: "tyre", term: "Wholesale delivery", detail: `${freeTier} · Free` },
    { icon: "warehouse", term: "Warehouse collection", detail: "Free pickup" },
  ] as const satisfies readonly { icon: keyof typeof ICONS; term: string; detail: string }[];

  const tiers = [
    { label: paidTier, value: formatCurrency(feeAud), note: "Delivery" },
    { label: freeTier, value: "Free", note: "Delivery", highlight: true },
    { label: order.pickup.label, value: "Free", note: "Collection" },
  ];

  return (
    <section id="delivery" className="warehouse">
      <div className="homepage-container warehouse__grid">
        <Reveal variant={motion === "strong" ? "rise stagger" : "rise"} className="warehouse__info-col">
          <div className="warehouse-card">
            <p className="eyebrow warehouse-card__eyebrow">Regency Park distribution</p>
            <h2 className="display warehouse-card__title">Warehouse &amp; delivery hub</h2>
            <p className="warehouse-card__lede">
              Wholesale tyre pickup and Adelaide-wide delivery from our Regency Park facility.
            </p>
            {/* The delivery rule itself stays derived from `order.delivery` via
                `deliveryRuleSummary`, never retyped here — the thresholds in
                this section must not be able to drift from config. */}
            <p className="warehouse-card__rule">{deliveryRuleSummary("card")}</p>

            <dl className="warehouse-facts">
              {facts.map((fact) => (
                <div key={fact.term} className="warehouse-fact">
                  <span className="warehouse-fact__icon" aria-hidden>{ICONS[fact.icon]}</span>
                  <div className="warehouse-fact__body">
                    <dt>{fact.term}</dt>
                    <dd>{fact.detail}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="warehouse-actions">
              <a className="btn btn--green group" href={maps.directionsUrl} target="_blank" rel="noopener noreferrer">
                <span>Get directions</span>
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>→</span>
              </a>
              <Link href="/delivery" className="btn btn--outline">View delivery details</Link>
            </div>
          </div>
        </Reveal>

        <Reveal variant="lift" delay={motion === "strong" ? 120 : 0} className="warehouse__map-col">
          <div className="warehouse-map">
            <div className="warehouse-map__head">
              <span className="warehouse-map__title">
                <span className="warehouse-map__pin" aria-hidden>{ICONS.pin}</span>
                Regency Park delivery hub
              </span>
              <span className="warehouse-map__area">{order.delivery.area}</span>
            </div>

            {/*
              The frame reserves its height (aspect-ratio plus a min-height
              floor) so the lazy iframe cannot shift the page when it paints.
              Only this wrapper is animated — never the iframe, which would
              force the map to repaint through the whole reveal.
            */}
            <div className="warehouse-map__frame">
              <iframe
                src={maps.embedUrl}
                title={`Google Map showing ${business.name} at ${address.oneLine}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <ul className="warehouse-tiers">
              {tiers.map((tier) => (
                <li key={tier.label} className={`warehouse-tier${tier.highlight ? " warehouse-tier--free" : ""}`}>
                  <span className="warehouse-tier__label">{tier.label}</span>
                  <span className="warehouse-tier__value">{tier.value}</span>
                  <span className="warehouse-tier__note">{tier.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <h2 className="sr-only">Free delivery on {freeQualifyingTyres}+ tyres.</h2>
    </section>
  );
}
