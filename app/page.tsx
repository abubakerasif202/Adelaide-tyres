import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { ProductCard } from "@/components/ProductCard";
import { CommercialTeaser } from "@/components/CommercialTeaser";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { SectionHeading } from "@/components/primitives";
import { getTyreBySlug, catalogueStats } from "@/lib/catalogue";
import { localBusinessJsonLd } from "@/lib/seo";
import { Reveal } from "@/components/Reveal";

export default function HomePage() {
  const preview = [
    "ralson-rmr61-295-80r22-5",
    "ralson-rdr55-11r22-5",
    "greforce-gr881w-11r22-5",
    "greforce-grd1919-11r22-5",
    "jumbo-ss398-295-80r22-5",
    "greforce-g-pilot-x1-295-80r22-5",
    "ralson-rac55-11r22-5",
    "haulmax-att101-11r22-5",
  ].map(getTyreBySlug).filter((tyre) => tyre !== undefined);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />
      <Hero />
      <Benefits />

      {/* Owns its own top rhythm — Benefits no longer supplies the seam padding. */}
      <section id="stock" className="bg-[var(--color-surface-muted)] pt-14 pb-[72px] md:pt-[88px] md:pb-24">
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

          {/* Editorial weighting: the lead product spans two columns on wide viewports
              so the preview is not eight identical tiles. 8 cards tile exactly at
              every breakpoint (1 col; 2 cols x 4 rows; 3 cols x 3 rows with the
              2-wide lead). */}
          <div className="mt-10 grid items-stretch gap-5 sm:grid-cols-2 md:mt-12 lg:grid-cols-3 lg:gap-6">
            {preview.map((tyre, i) => (
              <Reveal
                key={tyre.id}
                delay={(i % 3) * 70}
                className={`h-full ${i === 0 ? "lg:col-span-2" : ""}`}
              >
                <ProductCard tyre={tyre} variant="feature" priority={i === 0} lead={i === 0} />
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 text-center">
            <Link href="/tyres" className="btn btn--green">
              View all listed stock
            </Link>
          </Reveal>
        </div>
      </section>

      <CommercialTeaser />

      {/* Spec: "a strong dark/light contrast transition into the existing
          free-delivery CTA". The light band breaks the dark CommercialTeaser ->
          dark CTA mass so the conversion block reads as a distinct arrival. */}
      <div className="delivery-band">
        <FreeDeliveryCTA />
      </div>
    </>
  );
}
