import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { EnquiryForm } from "@/components/EnquiryForm";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { SectionHeading } from "@/components/primitives";
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/seo";

const freeQualifyingTyres = order.delivery.freeQualifyingTyres;
const paidDeliveryRange = `1–${freeQualifyingTyres - 1}`;
const deliveryFee = formatCurrency(order.delivery.feeAud);

export const metadata: Metadata = {
  title: "Commercial & Fleet Tyre Supply Adelaide | Wholesale Truck Tyres",
  description:
    `Wholesale truck and commercial tyre supply for Adelaide transport companies, workshops, mechanics and fleet operators. No minimum order. ${deliveryFee} Adelaide-wide delivery for ${paidDeliveryRange} tyres, free from ${freeQualifyingTyres} tyres. Regency Park warehouse pickup is free.`,
  alternates: { canonical: "/commercial" },
};

const blocks = [
  { title: "Truck tyres", copy: "Steer, drive and trailer patterns in 22.5\" fitments from current stock." },
  { title: "Commercial tyres", copy: "Light-truck and medium commercial sizes for distribution and service fleets." },
  { title: "Fleet purchasing", copy: "Mix products and quantities from current Adelaide stock for your business." },
  { title: "Bulk stock", copy: "Order to your run rate — quantities aren't capped at a single set." },
  { title: "Recurring supply", copy: "Contact the wholesale team to discuss your sizes, quantities and supply needs." },
  { title: "Free Adelaide delivery", copy: `Free Adelaide-wide delivery for ${freeQualifyingTyres}+ tyres. ${paidDeliveryRange} tyres: ${deliveryFee} delivery. Warehouse pickup is free.` },
];

export default function CommercialPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Commercial", path: "/commercial" },
            ]),
          ),
        }}
      />
      <PageHeader
        eyebrow="Wholesale supply"
        title="Wholesale tyre supply for Adelaide business."
        intro="Truck, commercial and fleet tyre supply for transport companies, workshops, mechanics, logistics operators and tyre resellers."
        crumbs={[{ name: "Home", path: "/" }, { name: "Commercial", path: "/commercial" }]}
      />

      <section className="bg-[var(--color-surface-muted)]">
        <div className="container-x py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blocks.map((b) => (
              <Reveal key={b.title} className="surface-card p-6">
                <h2 className="display text-[21px]">{b.title}</h2>
                <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">{b.copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-x py-14">
          <SectionHeading
            eyebrow="Request wholesale pricing"
            title="Tell us your fitments and volume"
            intro="Send the sizes, patterns and quantities you run. We'll come back with wholesale pricing and current stock."
          />
          <div className="mt-8 max-w-3xl">
            <EnquiryForm variant="quote" />
          </div>
        </div>
      </section>

      <FreeDeliveryCTA />
    </>
  );
}
