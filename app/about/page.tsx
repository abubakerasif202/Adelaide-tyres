import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { business } from "@/lib/config";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Adelaide Wholesale Tyres | Regency Park Tyre Wholesaler",
  description:
    "Adelaide Wholesale Tyres supplies truck, commercial, passenger and light-commercial tyres in bulk from Regency Park. Minimum order four tyres, free Adelaide-wide delivery.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "About", path: "/about" },
            ]),
          ),
        }}
      />
      <PageHeader
        eyebrow="About"
        title="A wholesale tyre supplier, not a retail shop."
        intro="We supply tyres in bulk to Adelaide workshops, fleets, transport operators and trade buyers — priced for volume, delivered across the metro area."
        crumbs={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]}
      />

      <section className="bg-[var(--color-surface-muted)]">
        <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 text-[16px] text-[var(--color-text-muted)]">
            <p>
              Adelaide Wholesale Tyres operates from {business.address.oneLine}. We hold
              current stock across common truck and commercial fitments and sell in
              minimum quantities of four tyres.
            </p>
            <p>
              Orders are placed online or by enquiry. We confirm stock and wholesale
              pricing, then deliver free across metropolitan Adelaide or hold the order for
              warehouse pickup.
            </p>
            <p>
              For workshops and fleets running regular volume, we set standing orders and
              hold stock against your schedule.
            </p>
          </div>
          <aside className="surface-card h-fit p-6">
            <h2 className="display text-[20px]">The essentials</h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px]">
              <li><strong>Location:</strong> {business.address.oneLine}</li>
              <li><strong>Minimum order:</strong> 4 tyres total</li>
              <li><strong>Delivery:</strong> Free across metropolitan Adelaide</li>
              <li><strong>Customers:</strong> Trade, fleet and bulk buyers</li>
            </ul>
          </aside>
        </div>
      </section>

      <FreeDeliveryCTA />
    </>
  );
}
