const benefits = [
  { title: "4 tyre minimum", copy: "Built for bulk purchasing" },
  { title: "Free delivery", copy: "Adelaide-wide delivery included", highlight: true },
  { title: "Live stock", copy: "Order from current available quantities" },
  { title: "Trade support", copy: "Commercial, truck and passenger sizes" },
];

export function Benefits() {
  return (
    <section className="bg-[var(--color-surface-muted)]">
      <div className="container-x relative z-10 -mt-16 grid gap-3 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className={`rounded-[var(--radius-md)] border p-5 ${
              b.highlight
                ? "border-transparent bg-[var(--color-green)] text-white"
                : "border-[var(--color-border)] bg-white"
            }`}
          >
            <h3 className="display text-[19px]">{b.title}</h3>
            <p
              className={`mt-1.5 text-[13px] ${
                b.highlight ? "text-white/80" : "text-[var(--color-text-muted)]"
              }`}
            >
              {b.copy}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
