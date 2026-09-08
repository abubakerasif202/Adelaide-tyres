import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { ProductCard } from "@/components/ProductCard";
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

      <section id="stock" className="bg-[var(--color-surface-muted)] pb-[72px]">
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

          <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] items-stretch gap-5">
            {preview.map((tyre, i) => (
              <Reveal key={tyre.id} delay={(i % 3) * 70} className="h-full">
                <ProductCard tyre={tyre} variant="feature" priority={i === 0} />
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

      <FreeDeliveryCTA />
    </>
  );
}
