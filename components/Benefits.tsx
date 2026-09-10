import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { business, order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

type SpecItem = {
  icon: "check" | "truck" | "bolt" | "warehouse";
  value: string;
  copy: string;
  highlight?: boolean;
  tag?: string;
};

const ICONS: Record<SpecItem["icon"], ReactNode> = {
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  truck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 6h11v10H2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.8" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="18" r="1.8" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  bolt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  warehouse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 10 12 4l9 6v9H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 19v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
};

const specs: readonly SpecItem[] = [
  { icon: "check", value: "No minimum order", copy: "Order from one tyre up" },
  {
    icon: "bolt",
    value: `${order.delivery.freeQualifyingTyres}+ tyres free`,
    copy: `1–${order.delivery.freeQualifyingTyres - 1} tyres · ${formatCurrency(order.delivery.feeAud)} delivery`,
    highlight: true,
    tag: "Wholesale tier",
  },
  { icon: "truck", value: "Adelaide-wide", copy: "Scheduled delivery across metro Adelaide" },
  { icon: "warehouse", value: "Free pickup", copy: business.address.oneLine },
];

export function Benefits() {
  return (
    <section className="homepage-benefits">
      <div className="homepage-container">
        <Reveal className="homepage-section-heading text-center">
          <p className="eyebrow">Transparent trade logistics</p>
          <h2 className="display">Built specifically for South Australian workshops &amp; fleets</h2>
        </Reveal>
        <div className="benefit-grid">
          {specs.map((s, index) => (
            <Reveal
              key={s.value}
              className={`benefit-card benefit-card--${s.icon}`}
              delay={index * 60}
            >
              {s.tag && <span className="spec-bar__tag">{s.tag}</span>}
              <span className="benefit-card__icon">{ICONS[s.icon]}</span>
              <h3 className="display benefit-card__title">{s.value}</h3>
              <p className="benefit-card__copy">{s.copy}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="delivery-meter">
          <span className="delivery-meter__icon">{ICONS.truck}</span>
          <div>
            <h3 className="display">Wholesale delivery tiers</h3>
            <p>1–{order.delivery.freeQualifyingTyres - 1} tyres: {formatCurrency(order.delivery.feeAud)} Adelaide-wide · {order.delivery.freeQualifyingTyres}+ tyres: free Adelaide-wide</p>
          </div>
          <div className="delivery-meter__scale" aria-hidden>
            <div><span>{formatCurrency(order.delivery.feeAud)} delivery</span><span>Free from {order.delivery.freeQualifyingTyres}</span></div>
            <span><i /></span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
