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

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px]">
            <div>
              <div className="surface-card product-detail-visual grid aspect-square place-items-center p-6 sm:p-10">
                <TyreImage
                  src={tyre.image}
                  alt={`${tyreFullName(tyre)} commercial tyre`}
                  size={460}
                  priority
                  sizes="(max-width: 639px) calc(100vw - 80px), (max-width: 1023px) 460px, (max-width: 1279px) 40vw, 460px"
                  className="h-auto w-full max-w-[460px]"
                />
              </div>


              <div className="mt-10">
                <h2 className="display text-[24px]">Specifications</h2>
                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {specs
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-[var(--color-border)] py-2">
                        <dt className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                          {k}
                        </dt>
                        <dd className="text-[14px] font-semibold capitalize">{v}</dd>
                      </div>
                    ))}
                </dl>
                {!tyre.loadIndex && (
                  <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                    Full load index, speed rating and construction details are confirmed
                    on your quote or invoice.
                  </p>
                )}
              </div>

              <div className="mt-10">
                <h2 className="display text-[24px]">About this tyre</h2>
                <p className="mt-3 max-w-2xl text-[15px] text-[var(--color-text-muted)]">
                  {tyre.description}
                </p>
              </div>
            </div>

            <div className="lg:sticky lg:top-[160px] lg:self-start">
              <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-red)]">
                {tyre.brand}
              </span>
              <h1 className="display mt-1 text-[clamp(34px,5vw,48px)]">{tyre.size}</h1>
              <p className="text-[16px] font-semibold text-[var(--color-text-muted)]">
                Pattern {tyre.pattern} · {APPLICATION_LABELS[tyre.application]}
              </p>
              <div className="mt-5">
                <ProductPurchasePanel tyre={tyre} />
              </div>
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
