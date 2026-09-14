import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { ProductCard } from "@/components/ProductCard";
import { accessoryEnquiryHref } from "@/components/AccessoryCard";
import { PriceDisplay } from "@/components/primitives";
import { accessories, getAccessoryBySlug, ACCESSORY_CATEGORY_LABELS } from "@/lib/accessories";
import { getAllTyres } from "@/lib/catalogue";
import { accessoryJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { business } from "@/lib/config";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return accessories.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const accessory = getAccessoryBySlug(slug);
  if (!accessory) {
    return { title: "Product not found", robots: { index: false, follow: false } };
  }
  // The root layout template appends " | Adelaide Wholesale Tyres".
  return {
    title: accessory.name,
    description: accessory.metaDescription,
    alternates: { canonical: `/accessories/${accessory.slug}` },
    openGraph: {
      title: `${accessory.name} | ${business.name}`,
      description: accessory.description,
      type: "website",
      images: [{ url: accessory.image, alt: accessory.imageAlt }],
    },
  };
}

export default async function AccessoryDetailPage({ params }: Params) {
  const { slug } = await params;
  const accessory = getAccessoryBySlug(slug);
  if (!accessory) notFound();

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Tyres", path: "/tyres" },
    { name: accessory.name, path: `/accessories/${accessory.slug}` },
  ];
  // Valves sit beside truck tyres in the catalogue, so surface truck stock.
  const related = getAllTyres().filter((t) => t.application === "truck" && t.featured).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(accessoryJsonLd(accessory)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />

      <div className="bg-[var(--color-surface-muted)]">
        <div className="container-x py-10">
          <Breadcrumbs items={crumbs} />

          {/* Same grid as the tyre detail page: identity, media, buy box,
              specs, description on mobile; media left / sticky panel right on
              desktop. */}
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
            <div className="lg:col-start-2 lg:row-start-1">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">
                {ACCESSORY_CATEGORY_LABELS[accessory.category]}
              </p>
              <h1 className="display mt-1 text-[clamp(36px,5vw,56px)]">{accessory.name}</h1>
              <p className="mt-2 text-[15px] font-semibold text-[var(--color-text-muted)]">{accessory.subtitle}</p>
            </div>

            <div className="lg:col-start-1 lg:row-start-1 lg:row-end-3">
              <div className="product-detail-media surface-card">
                <Image
                  src={accessory.image}
                  alt={accessory.imageAlt}
                  width={460}
                  height={727}
                  priority
                  sizes="(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) 460px, 46vw"
                  className="h-auto max-h-[560px] w-auto max-w-full"
                />
              </div>
            </div>

            <div className="lg:col-start-2 lg:row-start-2 lg:row-end-5 lg:sticky lg:top-[calc(var(--header-total)+44px)] lg:self-start">
              <div className="surface-card p-6" data-testid="enquiry-panel">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Price</span>
                  <PriceDisplay price={accessory.price} fractionDigits={2} />
                </div>
                <p className="mt-1 text-[13px] font-semibold text-[var(--color-green)]">Sold on enquiry · SKU {accessory.sku}</p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <Link href={accessoryEnquiryHref(accessory)} className="btn btn--red w-full">
                    Enquire about this valve
                  </Link>
                  <Link href="/tyres" className="link-underline inline-flex min-h-[44px] items-center justify-center self-center text-[13px] font-bold uppercase tracking-wide">
                    Back to catalogue
                  </Link>
                </div>
                <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-[13px] text-[var(--color-text-muted)]">
                  <p>Tell us the quantity you need and we&apos;ll confirm availability and dispatch with your tyre order.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-start-1 lg:row-start-3">
              <section aria-label="Product specifications">
                <h2 className="display text-[24px]">Specifications</h2>
                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {accessory.specs.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 border-b border-[var(--color-border)] py-2">
                      <dt className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{key}</dt>
                      <dd className="text-right text-[14px] font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <div className="lg:col-start-1 lg:row-start-4">
              <h2 className="display text-[24px]">About this product</h2>
              <p className="mt-3 max-w-2xl text-[15px] text-[var(--color-text-muted)]">{accessory.description}</p>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between">
                <h2 className="display text-[28px]">Truck tyres in stock</h2>
                <Link href="/tyres" className="link-underline inline-flex min-h-[44px] items-center text-[13px] font-bold uppercase tracking-wide">
                  All stock
                </Link>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((t) => (
                  <ProductCard key={t.id} tyre={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <FreeDeliveryCTA />
    </>
  );
}
