import { business, order, siteUrl } from "./config";
import { formatCurrency } from "./format";
import type { Tyre } from "./catalogue";
import { tyreFullName } from "./tyre";

/**
 * Structured data. Only facts we actually hold are included — no invented
 * reviews, ratings, opening hours, phone numbers or identifiers.
 */

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: business.address.street,
  addressLocality: business.address.suburb,
  addressRegion: business.address.state,
  postalCode: business.address.postcode,
  addressCountry: "AU",
};

export function organizationJsonLd() {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "AutoPartsStore"],
    "@id": `${siteUrl}/#organization`,
    name: business.name,
    url: siteUrl,
    address: postalAddress,
    areaServed: { "@type": "City", name: "Adelaide" },
    slogan: "Buy tyres in bulk. Pay wholesale.",
  };
  if (business.phone) node.telephone = business.phone;
  if (business.email) node.email = business.email;
  return node;
}

export function localBusinessJsonLd() {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["TireShop", "AutomotiveBusiness", "LocalBusiness"],
    "@id": `${siteUrl}/#localbusiness`,
    name: business.name,
    url: siteUrl,
    address: postalAddress,
    areaServed: { "@type": "City", name: "Adelaide" },
    description: `Wholesale tyre supplier in Regency Park serving Adelaide workshops, fleets and transport operators. No minimum order, ${formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery under ${order.delivery.freeQualifyingTyres} tyres, free for ${order.delivery.freeQualifyingTyres}+.`,
  };
  if (business.phone) node.telephone = business.phone;
  if (business.email) node.email = business.email;
  return node;
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: business.name,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

export function productJsonLd(tyre: Tyre) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tyreFullName(tyre),
    brand: { "@type": "Brand", name: tyre.brand },
    mpn: tyre.pattern,
    category: "Tyres",
    description: tyre.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "AUD",
      price: tyre.price,
      availability:
        tyre.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@id": `${siteUrl}/#organization` },
      url: `${siteUrl}/tyres/${tyre.slug}`,
    },
  };
}
