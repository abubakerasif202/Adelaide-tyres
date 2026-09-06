import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EnquiryForm } from "@/components/EnquiryForm";
import { ContactChannels } from "@/components/ContactChannels";
import { breadcrumbJsonLd, localBusinessJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact & Wholesale Enquiry | Adelaide Wholesale Tyres",
  description:
    "Contact Adelaide Wholesale Tyres for bulk tyre orders and wholesale quotes. 6 Birralee Rd, Regency Park SA 5010. Minimum order four tyres, free Adelaide-wide delivery.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const variant = type === "quote" ? "quote" : "contact";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Contact", path: "/contact" },
            ]),
          ),
        }}
      />
      <PageHeader
        eyebrow={variant === "quote" ? "Wholesale quote" : "Contact"}
        title={variant === "quote" ? "Request wholesale pricing" : "Contact the wholesale team"}
        intro="Send the sizes, patterns and quantities you need. We'll confirm current stock and wholesale pricing."
        crumbs={[{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]}
      />

      <section className="bg-[var(--color-surface-muted)]">
        <div className="container-x grid gap-8 py-14 lg:grid-cols-[1fr_360px]">
          <div id="enquiry">
            <EnquiryForm variant={variant} />
          </div>
          <ContactChannels />
        </div>
      </section>
    </>
  );
}
