import { Reveal } from "./Reveal";

const benefits = [
  { title: "No minimum order", copy: "Order any quantity" },
  { title: "8+ tyres", copy: "Free Adelaide-wide delivery", detail: "1–7 tyres · $50 delivery", highlight: true },
  { title: "Listed stock", copy: "Browse the Adelaide inventory shown online" },
  { title: "Trade support", copy: "Truck and commercial tyre supply" },
];

export function Benefits() {
  return (
    <section className="bg-[var(--color-surface-muted)]">
      <div className="container-x relative z-10 -mt-16 grid gap-3.5 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, index) => (
          <Reveal key={b.title} delay={index * 70} className="h-full">
          <div
            className={`benefit-card h-full rounded-[var(--radius-md)] border p-5 ${
              b.highlight
                ? "benefit-card--highlight border-transparent text-white"
                : "border-[var(--color-border)] bg-white"
            }`}
          >
            <h3 className="display text-[21px]">{b.title}</h3>
            <p
              className={`mt-1.5 text-[13px] ${
                b.highlight ? "text-white/80" : "text-[var(--color-text-muted)]"
              }`}
            >
              {b.copy}
            </p>
            {b.detail && <p className="mt-1 text-[12px] font-semibold text-[#7fd1b3]">{b.detail}</p>}
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
