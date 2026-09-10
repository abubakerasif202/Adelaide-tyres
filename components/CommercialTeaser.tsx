import Link from "next/link";
import { Reveal } from "./Reveal";
import { catalogueStats, uniqueBrands, uniqueSizes } from "@/lib/catalogue";

/**
 * Homepage teaser for wholesale/fleet supply. Copy is the same verified set
 * used on /commercial (app/commercial/page.tsx) — do not add claims here that
 * aren't already published there. The stat panel is entirely derived from
 * the live catalogue, never invented figures.
 */
const points = [
  { title: "Truck tyres", copy: "Steer, drive and trailer patterns in 22.5\" fitments from current stock." },
  { title: "Fleet purchasing", copy: "Mix products and quantities from current Adelaide stock for your business." },
  { title: "Recurring supply", copy: "Contact the wholesale team to discuss your sizes, quantities and supply needs." },
] as const;

export function CommercialTeaser() {
  const stats = [
    { value: catalogueStats.skuLines, label: "Listed SKU lines" },
    { value: catalogueStats.unitsListed, label: "Units in the warehouse" },
    { value: uniqueBrands().length, label: "Brands carried" },
    { value: uniqueSizes().length, label: "Sizes in stock" },
  ];

  return (
    <section id="commercial" className="commercial-band on-dark relative overflow-hidden text-white">
      <div className="commercial-band__texture pointer-events-none absolute inset-0" aria-hidden />
      <Reveal className="container-x relative grid gap-12 py-20 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow text-[#7fd1b3]">Wholesale supply</p>
          <h2 className="display mt-2 text-[clamp(32px,4.6vw,50px)]">
            Truck, commercial and fleet tyre supply
          </h2>
          <p className="mt-4 max-w-lg text-[16px] text-white/72">
            For transport companies, workshops, mechanics, logistics operators and tyre
            resellers across Adelaide.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {points.map((p) => (
              <div key={p.title} className="commercial-point">
                <h3 className="display text-[18px]">{p.title}</h3>
                <p className="mt-1.5 text-[13px] text-white/68">{p.copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/commercial" className="btn btn--red">
              Request wholesale pricing
            </Link>
            <Link href="/commercial" className="btn btn--outline-light">
              View commercial supply
            </Link>
          </div>
        </div>

        <div className="commercial-stat-panel">
          <p className="eyebrow text-white/55">Wholesale supply at a glance</p>
          <div className="mt-5 grid grid-cols-2 gap-5">
            {stats.map((s) => (
              <div key={s.label} className="commercial-stat">
                <span className="display commercial-stat__value">{s.value}</span>
                <span className="commercial-stat__label">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-white/12 pt-5 text-[12px] font-semibold text-white/55">
            Live from the Adelaide catalogue — updated as stock moves.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
