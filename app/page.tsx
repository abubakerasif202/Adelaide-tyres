import { Hero } from "@/components/Hero";
import Link from "next/link";
import { Benefits } from "@/components/Benefits";
import { ProductCard } from "@/components/ProductCard";
import { CommercialTeaser } from "@/components/CommercialTeaser";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { SectionHeading } from "@/components/primitives";
import { catalogue, getFeaturedTyres, uniqueSizes } from "@/lib/catalogue";
import { localBusinessJsonLd } from "@/lib/seo";
import { Reveal } from "@/components/Reveal";

/** Shown large in the hero studio bay — kept out of the showcase below it. */
const HERO_TYRE_SLUG = "ralson-rmr61-295-80r22-5";

export default function HomePage() {
  // Real, business-flagged featured stock (lib/catalogue.ts `featured: true`),
  // excluding whichever SKU the hero is already showing, sorted by stock so
  // the highest-availability tyre leads the editorial showcase.
  const featured = getFeaturedTyres()
    .filter((tyre) => tyre.slug !== HERO_TYRE_SLUG)
    .sort((a, b) => b.stock - a.stock);
  const previewTyres = [...featured, ...catalogue.filter((tyre) => !featured.some((item) => item.id === tyre.id))].slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />
      <Hero />
      <HomepageFinder />
      <Benefits />

      <section id="stock" className="homepage-stock">
        <div className="homepage-container">
          <Reveal className="homepage-stock-head flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Regency Park warehouse inventory"
              title="In-demand wholesale stock"
            />
            {/* Stitch shows a category pill row here. These map to the real
                catalogue application filters rather than decorative tabs. */}
            <div className="homepage-stock-pills">
              <span className="homepage-stock-pill is-active">All stock</span>
              <Link href="/tyres?application=truck" className="homepage-stock-pill">Truck</Link>
              <Link href="/tyres?application=commercial" className="homepage-stock-pill">Commercial</Link>
            </div>
          </Reveal>

          <div className="homepage-stock-grid mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-12">
            {previewTyres.map((tyre, index) => (
              <Reveal key={tyre.id} delay={index * 70}>
                <ProductCard tyre={tyre} priority={index < 2} variant="homepage" />
              </Reveal>
            ))}
          </div>
          <div className="mt-9 text-center">
            <Link href="/tyres" className="btn btn--green">View full catalogue <span aria-hidden>→</span></Link>
            <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">Live listed stock from the Regency Park warehouse.</p>
          </div>
        </div>
      </section>

      <CommercialTeaser />

      <FreeDeliveryCTA />
    </>
  );
}

function HomepageFinder() {
  const sizes = uniqueSizes();
  return (
    <section id="finder" className="homepage-finder relative z-20">
      <div className="homepage-container">
        <Reveal>
        <form action="/tyres" className="surface-card homepage-finder__panel">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--color-border)] pb-4">
            <span className="homepage-finder__tab">All tyres</span>
            <Link href="/tyres?application=commercial" className="homepage-finder__tab homepage-finder__tab--muted">Truck &amp; commercial</Link>
            <Link href="/tyres?application=truck" className="homepage-finder__tab homepage-finder__tab--muted">Truck fitments</Link>
          </div>
          <div className="homepage-finder__fields grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label><span className="field-label">1. Search</span><input name="q" className="field-input" placeholder="Brand or pattern" /></label>
            <label><span className="field-label">2. Tyre size</span><select name="size" defaultValue="" className="field-input"><option value="">Any size</option>{sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <label><span className="field-label">Application</span><select name="application" defaultValue="" className="field-input"><option value="">All applications</option><option value="truck">Truck</option><option value="commercial">Commercial</option></select></label>
            <label><span className="field-label">Availability</span><select name="stock" defaultValue="in" className="field-input"><option value="in">In stock now</option><option value="">All listed stock</option></select></label>
            <button className="btn btn--red self-end group" type="submit"><span>Find tyres</span> <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>→</span></button>
          </div>
          <div className="homepage-finder__shortcuts mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            <span>Popular sizes:</span>{sizes.slice(0, 6).map((size) => <Link className="homepage-finder__chip" href={`/tyres?size=${encodeURIComponent(size)}`} key={size}>{size}</Link>)}
          </div>
        </form>
        </Reveal>
      </div>
    </section>
  );
}
