import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { HomeStockShowcase } from "@/components/HomeStockShowcase";
import { CommercialTeaser } from "@/components/CommercialTeaser";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { SectionHeading } from "@/components/primitives";
import { catalogueStats, getFeaturedTyres, getTyreBySlug } from "@/lib/catalogue";
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
  const [lead, ...supporting] = featured.length > 0 ? featured : [getTyreBySlug(HERO_TYRE_SLUG)!];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />
      <Hero />
      <Benefits />

      <section id="stock" className="bg-[var(--color-surface-muted)] pb-20 pt-12 md:pb-28 md:pt-16">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Shop available stock"
              title="Order from listed stock"
              intro="Wholesale pricing per tyre. No minimum order — mix any products, any quantity."
            />
            <span className="pill pill--muted">
              <span className="size-[7px] rounded-full bg-[var(--color-green)]" aria-hidden />
              Listed Adelaide stock · {catalogueStats.skuLines} SKU lines · {catalogueStats.unitsListed} units
            </span>
          </Reveal>

          <HomeStockShowcase lead={lead} supporting={supporting.slice(0, 3)} />
        </div>
      </section>

      <CommercialTeaser />

      {/* Dark -> light -> dark step into the final conversion block: without
          the light band, the dark CommercialTeaser and the dark delivery CTA
          read as one undifferentiated mass. */}
      <div className="delivery-band">
        <FreeDeliveryCTA />
      </div>
    </>
  );
}
