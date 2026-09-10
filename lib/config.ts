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
    street: "4 Birralee Rd",
    suburb: "Regency Park",
    state: "SA",
    postcode: "5010",
    country: "Australia",
    /** One-line form used in headers, footers and structured data. */
    oneLine: "4 Birralee Rd, Regency Park SA 5010",
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

/**
 * Map links. Both are built from `business.address` by query, deliberately:
 * a hardcoded lat/lng is a second copy of the address that can silently drift
 * out of sync with it, and we hold no surveyed coordinates for the site.
 * The embed form needs no API key.
 */
/**
 * Street address only. Prefixing the business name makes Google's geocoder
 * fall back to a fuzzy area match several kilometres off (verified: the embed
 * landed near Dry Creek instead of Birralee Rd); the bare address pins the
 * marker on the warehouse exactly.
 */
const addressQuery = encodeURIComponent(
  `${business.address.oneLine}, ${business.address.country}`,
);
const destinationQuery = addressQuery;

export const maps = {
  /** Keyless Google Maps embed centred on the Regency Park warehouse. */
  embedUrl: `https://www.google.com/maps?q=${addressQuery}&z=16&output=embed`,
  /** Opens turn-by-turn directions in Google Maps (web or native app). */
  directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`,
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
    /** Derived, never restated — see `business.address.oneLine`. */
    address: business.address.oneLine,
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

/**
 * The desktop announcement-bar message text lives in `lib/format.ts`
 * (`deliveryRuleSummary("announcement")`) so it derives from the same
 * `order.delivery` numbers as the mobile half — it cannot drift here.
 */
export const announcement = {
  address: business.address.oneLine,
} as const;
