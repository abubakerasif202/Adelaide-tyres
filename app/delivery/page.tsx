import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { business, order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Adelaide Tyre Delivery Rates | Regency Park Warehouse Pickup",
  description: `No minimum order. ${formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery on wholesale tyre orders under ${order.delivery.freeQualifyingTyres} tyres, free from ${order.delivery.freeQualifyingTyres} tyres up. Warehouse pickup available at 6 Birralee Rd, Regency Park SA 5010.`,
  alternates: { canonical: "/delivery" },
};

const faqs = [
  {
    q: "Is there a minimum order?",
    a: "No. Order any quantity, from a single tyre up.",
  },
  {
    q: "How much does delivery cost?",
    a: `${formatCurrency(order.delivery.feeAud)} flat for orders of 1–${order.delivery.freeQualifyingTyres - 1} tyres delivered within metropolitan Adelaide. Free from ${order.delivery.freeQualifyingTyres} tyres up.`,
  },
  {
    q: "Do you deliver outside metropolitan Adelaide?",
    a: "Contact the wholesale team with your location and we'll quote freight or arrange a carrier.",
  },
  {
    q: "Can I collect from the warehouse?",
    a: `Yes, and it's always free. Choose warehouse pickup at checkout and collect from ${order.pickup.address}.`,
  },
];

export default function DeliveryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Delivery", path: "/delivery" },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      <PageHeader
        eyebrow="Delivery"
        title="No minimum order. Adelaide wide."
        intro={`${formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery on orders under ${order.delivery.freeQualifyingTyres} tyres, free from ${order.delivery.freeQualifyingTyres} up. Warehouse pickup available from Regency Park.`}
        crumbs={[{ name: "Home", path: "/" }, { name: "Delivery", path: "/delivery" }]}
      />

      <section className="bg-[var(--color-surface-muted)]">
        <div className="container-x grid gap-4 py-14 md:grid-cols-3">
          <div className="surface-card p-6" id="pricing">
            <h2 className="display text-[20px]">Delivery pricing</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
              No minimum order. {formatCurrency(order.delivery.feeAud)} flat for 1–
              {order.delivery.freeQualifyingTyres - 1} tyres, free from{" "}
              {order.delivery.freeQualifyingTyres} tyres up.
            </p>
          </div>
          <div className="surface-card p-6">
            <h2 className="display text-[20px]">Delivery process</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
              Order online, we confirm stock and pricing, then dispatch across metropolitan
              Adelaide. Delivery windows are confirmed with you directly — we don&apos;t
              publish fixed times.
            </p>
          </div>
          <div className="surface-card p-6" id="pickup">
            <h2 className="display text-[20px]">Warehouse pickup</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
              {business.address.oneLine}. Choose pickup at checkout.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-x py-14">
          <h2 className="display text-[clamp(26px,4vw,40px)]">Delivery FAQ</h2>
          <dl className="mt-6 max-w-3xl divide-y divide-[var(--color-border)]">
            {faqs.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="text-[17px] font-bold">{f.q}</dt>
                <dd className="mt-1.5 text-[15px] text-[var(--color-text-muted)]">{f.a}</dd>
              </div>
            ))}
          </dl>
          <Link href="/contact" className="btn btn--green mt-8">
            Ask about a delivery
          </Link>
        </div>
      </section>

      <FreeDeliveryCTA />
    </>
  );
}
