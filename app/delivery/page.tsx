import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FreeDeliveryCTA } from "@/components/FreeDeliveryCTA";
import { business, order } from "@/lib/config";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Free Adelaide-Wide Tyre Delivery | Regency Park Warehouse Pickup",
  description:
    "Free Adelaide-wide delivery on wholesale tyre orders of four or more tyres. Warehouse pickup available at 6 Birralee Rd, Regency Park SA 5010.",
  alternates: { canonical: "/delivery" },
};

const faqs = [
  {
    q: "What makes an order qualify for free delivery?",
    a: `Any order of ${order.minimumTyres} or more tyres total, delivered within metropolitan Adelaide.`,
  },
  {
    q: "Can I mix products to reach the minimum?",
    a: "Yes. The minimum is four tyres in total across the order — mix any sizes, brands and patterns.",
  },
  {
    q: "Do you deliver outside metropolitan Adelaide?",
    a: "Contact the wholesale team with your location and we'll quote freight or arrange a carrier.",
  },
  {
    q: "Can I collect from the warehouse?",
    a: `Yes. Choose warehouse pickup at checkout and collect from ${order.pickup.address}.`,
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
        title="Free delivery. Adelaide wide."
        intro={`Free Adelaide-wide delivery on every order of ${order.minimumTyres} or more tyres. Warehouse pickup available from Regency Park.`}
        crumbs={[{ name: "Home", path: "/" }, { name: "Delivery", path: "/delivery" }]}
      />

      <section className="bg-[var(--color-surface-muted)]">
        <div className="container-x grid gap-4 py-14 md:grid-cols-3">
          <div className="surface-card p-6" id="minimum">
            <h2 className="display text-[20px]">Minimum order</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
              {order.minimumTyres} tyres total. Mix any products to get there.
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
