import Link from "next/link";
import { Reveal } from "./Reveal";
import { catalogueStats } from "@/lib/catalogue";

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
  return (
    <section id="commercial" className="commercial-band on-dark relative overflow-hidden text-white">
      <div className="commercial-band__texture pointer-events-none absolute inset-0" aria-hidden />
      <Reveal className="homepage-container commercial-band__grid relative grid items-center gap-8 py-[72px] lg:grid-cols-12">
        <div className="lg:col-span-7">
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

        <div className="commercial-quote-card lg:col-span-5">
          <p className="eyebrow text-[var(--color-green)]">Wholesale pricing / fleet quote</p>
          <h3 className="display mt-2 text-[28px] text-[var(--color-green-deep)]">Tell us what your operation needs</h3>
          <p className="mt-3 text-[14px] text-[var(--color-text-muted)]">Send your required sizes and quantities through the existing wholesale enquiry workflow. Current catalogue stock includes {catalogueStats.skuLines} listed SKU lines and {catalogueStats.unitsListed} units.</p>
          <div className="commercial-quote-card__lines" aria-hidden><span/><span/><span/></div>
          <Link href="/contact?type=quote" className="btn btn--green mt-6 w-full">Request wholesale pricing</Link>
          <p className="mt-3 text-center text-[12px] text-[var(--color-text-muted)]">No credit terms or response time is implied.</p>
        </div>
      </Reveal>
    </section>
  );
}
