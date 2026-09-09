/**
 * Central business configuration. Every user-facing string about the business,
 * the order rules and the service area lives here so components never hardcode them.
 */

export const business = {
  name: "Adelaide Wholesale Tyres",
  shortName: "AWT",
  domain: "adelaidewholesaletyres.com.au",
  tagline: "Wholesale tyre supply for Adelaide workshops, fleets and transport operators.",
  address: {
    street: "6 Birralee Rd",
    suburb: "Regency Park",
    state: "SA",
    postcode: "5010",
    country: "Australia",
    /** One-line form used in headers, footers and structured data. */
    oneLine: "6 Birralee Rd, Regency Park SA 5010",
  },
  serviceArea: {
    label: "Adelaide-wide",
    /** Metropolitan Adelaide. Used for the free-delivery qualification copy. */
    description: "Metropolitan Adelaide",
  },
  /**
   * Public contact details are read from the environment so the site never shows
   * invented data. When unset, the UI hides the call/email affordances.
   */
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "",
} as const;

export const order = {
  currency: "AUD",
  /** Default quantity pre-filled on product cards and detail pages. No minimum order. */
  defaultQuantity: 1,
  delivery: {
    area: "Adelaide-wide",
    /** Flat delivery fee (AUD) for orders below the free-delivery threshold. */
    feeAud: 50,
    /** Free Adelaide-wide delivery once total tyre quantity reaches this. */
    freeQualifyingTyres: 8,
  },
  pickup: {
    label: "Warehouse pickup",
    address: "6 Birralee Rd, Regency Park SA 5010",
  },
  /** Real, business-supplied wholesale pricing. */
  pricingIsPlaceholder: false,
} as const;

/**
 * NEXT_PUBLIC_SITE_URL is optional and public-facing; a malformed value must
 * never take the whole site down (it previously did — every route 500'd
 * because `new URL()` on the raw env value threw during layout metadata
 * evaluation). Validate it and fall back to the known domain instead.
 */
function resolveSiteUrl(): string {
  const fallback = `https://${business.domain}`;
  const candidate = process.env.NEXT_PUBLIC_SITE_URL;
  if (!candidate) return fallback;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export const siteUrl = resolveSiteUrl();

export const nav = [
  { label: "Shop Tyres", href: "/tyres" },
  { label: "Commercial", href: "/commercial" },
  { label: "Delivery", href: "/delivery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const announcement = {
  message: "NO MINIMUM ORDER · $50 DELIVERY (1–7 TYRES) · FREE DELIVERY 8+ TYRES",
  address: business.address.oneLine,
} as const;
