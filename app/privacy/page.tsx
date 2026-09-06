import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { business } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Adelaide Wholesale Tyres collects, uses and protects personal information.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy policy"
        crumbs={[{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }]}
      />
      <section className="bg-white">
        <div className="container-x prose-legal max-w-3xl py-14 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          <p>
            This policy explains how {business.name} ({business.domain}) handles personal
            information collected through this website.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Information we collect</h2>
          <p>
            When you place an order or send an enquiry we collect the details you provide:
            name, business name, phone, email, delivery address and any message or order
            notes. We do not collect payment card details through this website.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">How we use it</h2>
          <p>
            We use your information to quote, confirm and fulfil orders, to arrange delivery
            or pickup, and to respond to your enquiry. We do not sell personal information.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Storage and third parties</h2>
          <p>
            Order and enquiry details are transmitted to our email provider so the wholesale
            team can act on them. Your cart is stored only in your own browser.
          </p>
          <h2 className="display mt-8 text-[20px] text-[var(--color-text)]">Access and contact</h2>
          <p>
            To request access to, or correction of, the information we hold about you,
            contact us via the enquiry form. Address: {business.address.oneLine}.
          </p>
          <p className="mt-8 text-[13px]">
            This is a general policy for a wholesale supply business and does not constitute
            legal advice.
          </p>
        </div>
      </section>
    </>
  );
}
