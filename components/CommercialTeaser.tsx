import Link from "next/link";
import { Reveal } from "./Reveal";

/**
 * Homepage teaser for wholesale/fleet supply. Copy is the same verified set
 * used on /commercial (app/commercial/page.tsx) — do not add claims here that
 * aren't already published there. The stat panel is entirely derived from
 * the live catalogue, never invented figures.
 */
const ICONS = {
  truck: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 6h11v10H2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  cart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 4h2.2l2.3 10.4h9.2L19 7H6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="19" r="1.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="19" r="1.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  repeat: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
} as const;

const points = [
  { icon: "truck", title: "Truck tyres", copy: "Steer, drive and trailer patterns in 22.5\" fitments from current stock." },
  { icon: "cart", title: "Fleet purchasing", copy: "Mix products and quantities from current Adelaide stock for your business." },
  { icon: "repeat", title: "Recurring supply", copy: "Contact the wholesale team to discuss your sizes, quantities and supply needs." },
] as const satisfies readonly { icon: keyof typeof ICONS; title: string; copy: string }[];

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
                <span className="commercial-point__icon" aria-hidden>{ICONS[p.icon]}</span>
                <h3 className="display text-[18px]">{p.title}</h3>
                <p className="mt-1.5 text-[13px] text-white/68">{p.copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/commercial" className="btn btn--red group">
              <span>Request wholesale pricing</span>
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
            <Link href="/commercial" className="btn btn--outline-light group">
              <span>View commercial supply</span>
              <span className="inline-block text-white/70 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="commercial-quote-card lg:col-span-5">
          <p className="eyebrow text-[var(--color-green)]">Wholesale pricing / fleet quote</p>
          <h3 className="display mt-2 text-[28px] text-[var(--color-green-deep)]">Tell us what your operation needs</h3>
          <p className="mt-3 text-[14px] text-[var(--color-text-muted)]">Fast-track verification for Australian registered businesses. Send your required sizes and quantities through the wholesale enquiry workflow.</p>
          {/* Stitch fills this slot with a fabricated ABN/credit application
              form. These are the fields the real enquiry actually asks for, so
              the card keeps the same rhythm without implying a credit process. */}
          <ul className="commercial-quote-card__lines">
            <li>Sizes, patterns and quantities</li>
            <li>Adelaide delivery or Regency Park pickup</li>
            <li>Your business contact details</li>
          </ul>
          <Link href="/contact?type=quote" className="btn btn--green mt-6 w-full">Request wholesale pricing</Link>
        </div>
      </Reveal>
    </section>
  );
}
