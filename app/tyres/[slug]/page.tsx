import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";
import { ProductCard } from "@/components/ProductCard";
import { TyreImage } from "@/components/TyreImage";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { catalogue, getTyreBySlug, getRelatedTyres, APPLICATION_LABELS } from "@/lib/catalogue";
import { tyreFullName, tyreSeoName } from "@/lib/tyre";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo";
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return catalogue.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const tyre = getTyreBySlug(slug);
  if (!tyre) {
    return {
      title: "Tyre not found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${tyreSeoName(tyre)} | Adelaide`,
    description: `${tyreFullName(tyre)} available wholesale in Adelaide. ${tyre.description} No minimum order, ${formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery under ${order.delivery.freeQualifyingTyres} tyres, free for ${order.delivery.freeQualifyingTyres}+, from Regency Park.`,
    alternates: { canonical: `/tyres/${tyre.slug}` },
    openGraph: {
      title: tyreSeoName(tyre),
      description: tyre.description,
      type: "website",
    },
  };
}

export default async function TyreDetailPage({ params }: Params) {
  const { slug } = await params;
  const tyre = getTyreBySlug(slug);
  if (!tyre) notFound();

  const related = getRelatedTyres(tyre);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Tyres", path: "/tyres" },
    { name: tyreFullName(tyre), path: `/tyres/${tyre.slug}` },
  ];

  const specs: [string, string | undefined][] = [
    ["Brand", tyre.brand],
    ["Pattern", tyre.pattern],
    ["Size", tyre.size],
    ["Application", APPLICATION_LABELS[tyre.application]],
    ["Axle position", tyre.position],
    ["Load index", tyre.loadIndex],
    ["Speed rating", tyre.speedRating],
    ["Construction", tyre.construction],
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(tyre)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />

      <div className="bg-[var(--color-surface-muted)]">
        <div className="container-x py-10">
          <Breadcrumbs items={crumbs} />

          {/*
            Mobile/tablet DOM order follows the Stage 2 spec priority:
            identity, media, price/stock + quantity + add-to-cart + delivery
            (the purchase panel), specifications, then description. The buy box
            still sits above the specs, so the Stage 1 fix is preserved.
            Desktop pins each block to an explicit grid cell, so the composition
            is unchanged: media on the left, identity + sticky purchase column
            on the right.
          */}
          <div className="product-detail-layout mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
            <div className="lg:col-start-2 lg:row-start-1">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">
                {tyre.brand}
              </p>
              <h1 className="display mt-1 text-[clamp(36px,5vw,56px)]">
                {tyreFullName(tyre)}
              </h1>
              <p className="mt-2 text-[15px] font-semibold text-[var(--color-text-muted)]">
                {APPLICATION_LABELS[tyre.application]}
              </p>
            </div>

            <div className="lg:col-start-1 lg:row-start-1 lg:row-end-3">
              <div className="product-detail-media surface-card">
                <TyreImage
                  src={tyre.image}
                  alt={`${tyreFullName(tyre)} commercial tyre`}
                  size={460}
                  priority
                  sizes="(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) 460px, 46vw"
                  className="h-auto w-full max-w-[500px]"
                />
              </div>
            </div>

            <div className="lg:col-start-2 lg:row-start-2 lg:row-end-5 lg:sticky lg:top-[160px] lg:self-start">
              <ProductPurchasePanel tyre={tyre} />
            </div>

            <div className="lg:col-start-1 lg:row-start-3">
              <section aria-label="Tyre specifications">
                <h2 className="display text-[24px]">Specifications</h2>
                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {specs
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-[var(--color-border)] py-2">
                        <dt className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                          {key}
                        </dt>
                        <dd className="text-[14px] font-semibold capitalize">{value}</dd>
                      </div>
                    ))}
                </dl>
              </section>
              {!tyre.loadIndex && (
                <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                  Full load index, speed rating and construction details are confirmed
                  on your quote or invoice.
                </p>
              )}
            </div>

            <div className="lg:col-start-1 lg:row-start-4">
              <h2 className="display text-[24px]">About this tyre</h2>
              <p className="mt-3 max-w-2xl text-[15px] text-[var(--color-text-muted)]">
                {tyre.description}
              </p>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between">
                <h2 className="display text-[28px]">Related tyres</h2>
                <Link href="/tyres" className="link-underline text-[13px] font-bold uppercase tracking-wide">
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
