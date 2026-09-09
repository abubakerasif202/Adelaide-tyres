import { Reveal } from "./Reveal";
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

type Benefit = {
  title: string;
  copy: string;
  detail?: string;
  highlight?: boolean;
};

const benefits: readonly Benefit[] = [
  { title: "No minimum order", copy: "Order from one tyre up" },
  {
    title: `${order.delivery.freeQualifyingTyres}+ tyres`,
    copy: "Free Adelaide-wide delivery",
    detail: `1–${order.delivery.freeQualifyingTyres - 1} tyres · ${formatCurrency(order.delivery.feeAud)} delivery`,
    highlight: true,
  },
  { title: "Listed stock", copy: "Browse current Adelaide inventory online" },
  { title: "Trade supply", copy: "Truck, commercial and fleet tyre supply" },
];

export function Benefits() {
  return (
    <section className="bg-[var(--color-surface-muted)]">
      <div className="container-x relative z-10 -mt-16 grid gap-3.5 pb-0 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, index) => (
          <Reveal key={b.title} delay={index * 70} className="h-full">
            <div
              className={`benefit-card h-full rounded-[var(--radius-md)] border p-5 ${
                b.highlight
                  ? "benefit-card--highlight border-transparent text-white"
                  : "border-[var(--color-border)] bg-white"
              }`}
            >
              <h2 className="display text-[21px]">{b.title}</h2>
              <p
                className={`mt-1.5 text-[13px] ${
                  b.highlight ? "text-white/80" : "text-[var(--color-text-muted)]"
                }`}
              >
                {b.copy}
              </p>
              {b.detail && (
                <p
                  className={`mt-1 text-[12px] font-semibold ${
                    b.highlight ? "text-[#7fd1b3]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {b.detail}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
