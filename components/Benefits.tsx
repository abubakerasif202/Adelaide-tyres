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
    <section className="bg-[var(--color-surface-muted)] pt-10 md:pt-14">
      <div className="container-x">
        <Reveal className="spec-bar overflow-hidden">
          {specs.map((s, index) => (
            <div
              key={s.value}
              className={`spec-bar__item ${s.highlight ? "spec-bar__item--highlight" : ""}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {s.tag && <span className="spec-bar__tag">{s.tag}</span>}
              <span className="spec-bar__icon">{ICONS[s.icon]}</span>
              <span className="display spec-bar__value">{s.value}</span>
              <span className="spec-bar__copy">{s.copy}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
