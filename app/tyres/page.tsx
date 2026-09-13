import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  getAllTyres,
  uniqueBrands,
  uniqueSizes,
  uniqueApplications,
  catalogueStats,
} from "@/lib/catalogue";
import { breadcrumbJsonLd } from "@/lib/seo";
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = {
  title: "Tyre Catalogue | Bulk Truck, Commercial & Passenger Tyres Adelaide",
  description: `Browse wholesale tyre stock available now in Adelaide. Filter by size, brand and application. No minimum order, ${formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery under ${order.delivery.freeQualifyingTyres} tyres, free for ${order.delivery.freeQualifyingTyres}+, from Regency Park.`,
  alternates: { canonical: "/tyres" },
};

export default function TyresPage() {
  const tyres = getAllTyres();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Tyres", path: "/tyres" },
            ]),
          ),
        }}
      />
      <div className="bg-[var(--color-surface-muted)]">
        <div className="container-x py-10">
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Tyres", path: "/tyres" }]} />
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="display text-[clamp(36px,5vw,56px)]">Wholesale tyre catalogue</h1>
              <p className="mt-2 max-w-xl text-[var(--color-text-muted)]">
                Search current Adelaide stock by size, brand or pattern. No minimum order.
              </p>
            </div>
            <span className="pill pill--muted">
              {catalogueStats.skuLines} SKU lines · live availability
            </span>
          </div>

          <div className="mt-8">
            <Suspense fallback={<p className="text-[var(--color-text-muted)]">Loading catalogue…</p>}>
              <CatalogueBrowser
                tyres={tyres}
                sizes={uniqueSizes()}
                brands={uniqueBrands()}
                applications={uniqueApplications()}
              />
            </Suspense>
          </div>
        </div>
      </div>
      <FreeDeliveryCTA />
    </>
  );
}
