import Link from "next/link";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./primitives";

/**
 * Homepage teaser for wholesale/fleet supply. Copy is the same verified set
 * used on /commercial (app/commercial/page.tsx) — do not add claims here that
 * aren't already published there.
 */
const points = [
  { title: "Truck tyres", copy: "Steer, drive and trailer patterns in 22.5\" fitments from current stock." },
  { title: "Fleet purchasing", copy: "Mix products and quantities from current Adelaide stock for your business." },
  { title: "Recurring supply", copy: "Contact the wholesale team to discuss your sizes, quantities and supply needs." },
] as const;

export function CommercialTeaser() {
  return (
    <section id="commercial" className="on-dark bg-[var(--color-green-deep)] text-white">
      <Reveal className="container-x py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Wholesale supply"
            title="Truck, commercial and fleet tyre supply"
            intro="For transport companies, workshops, mechanics, logistics operators and tyre resellers across Adelaide."
            tone="light"
          />
          <Link href="/commercial" className="btn btn--outline-light shrink-0">
            View commercial supply
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {points.map((p) => (
            <div key={p.title} className="rounded-[var(--radius-md)] border border-white/14 bg-white/[0.04] p-5">
              <h3 className="display text-[19px]">{p.title}</h3>
              <p className="mt-1.5 text-[13px] text-white/72">{p.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/commercial" className="btn btn--red">
            Request wholesale pricing
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
