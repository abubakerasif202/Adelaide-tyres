import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { ProductCard } from "@/components/ProductCard";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { SectionHeading } from "@/components/primitives";
import { getFeaturedTyres, getAllTyres, catalogueStats } from "@/lib/catalogue";
import { localBusinessJsonLd } from "@/lib/seo";

export default function HomePage() {
  const featured = getFeaturedTyres();
  const preview = featured.length >= 3 ? featured : getAllTyres().slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />
      <Hero />
      <Benefits />

      <section className="bg-[var(--color-surface-muted)] pb-16">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Shop available stock"
              title="Order from current stock"
              intro="Wholesale pricing per tyre. Mix any products — the only rule is four tyres total."
            />
            <span className="pill pill--muted">
              {catalogueStats.skuLines} SKU lines · {catalogueStats.unitsListed} units listed
            </span>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {preview.slice(0, 6).map((tyre, i) => (
              <ProductCard key={tyre.id} tyre={tyre} priority={i < 3} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/tyres" className="btn btn--green">
              View all current stock
            </Link>
          </div>
        </div>
      </section>

      <FreeDeliveryCTA />
    </>
  );
}
