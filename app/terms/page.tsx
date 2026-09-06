import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { business, order } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms of sale and website use for Adelaide Wholesale Tyres.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Terms and conditions"
        crumbs={[{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }]}
      />
      <section className="bg-white">
        <div className="container-x max-w-3xl py-14 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          <h2 className="display text-[20px] text-[var(--color-text)]">Orders</h2>
          <p>
            The minimum order is {order.minimumTyres} tyres in total. Placing an order on
            this website is a request to purchase. {business.name} confirms stock
            availability and final wholesale pricing before an order is accepted and
            dispatched.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Pricing</h2>
          <p>
            Prices shown on this website are indicative and are being finalised. The price
            confirmed on your quote or invoice applies. Prices are in Australian dollars.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Delivery and pickup</h2>
          <p>
            Free delivery applies to qualifying orders within metropolitan Adelaide.
            Delivery timeframes are confirmed directly and are not guaranteed. Warehouse
            pickup is available from {order.pickup.address}.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Payment</h2>
          <p>
            Payment is arranged with the wholesale team after the order is confirmed. Card
            details are not collected through this website.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Returns</h2>
          <p>
            Consumer guarantees under Australian Consumer Law apply. Contact us about any
            tyre supplied with a manufacturing fault.
          </p>
          <p className="mt-8 text-[13px]">
            These terms are a general framework for a wholesale supply business and do not
            constitute legal advice.
          </p>
        </div>
      </section>
    </>
  );
}
