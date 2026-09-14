/**
 * Typed accessory catalogue (valves, fittings and other non-tyre lines).
 *
 * Accessories are deliberately kept out of `catalogue: Tyre[]`: they have no
 * size/pattern/application, are not tracked in the 247 inventory feed, and must
 * not count towards the tyre-based free-delivery threshold. They are sold on
 * enquiry — the storefront shows price and detail, the sales team confirms
 * quantity and dispatch.
 */

export type AccessoryCategory = "valves";

export type Accessory = {
  id: string;
  slug: string;
  /** Product / SKU code shown to buyers and used in enquiries. */
  sku: string;
  name: string;
  subtitle: string;
  category: AccessoryCategory;
  /** Price per unit in AUD. */
  price: number;
  /** Path under /public; the image alt text is supplied explicitly. */
  image: string;
  imageAlt: string;
  description: string;
  /** Exact meta description for the detail page (business-supplied copy). */
  metaDescription: string;
  /** Ordered specification rows for the detail page. */
  specs: [label: string, value: string][];
  /** Extra search terms beyond name/sku/subtitle (lower-case not required). */
  keywords: string[];
};

export const ACCESSORY_CATEGORY_LABELS: Record<AccessoryCategory, string> = {
  valves: "Truck Tyre Accessories / Valves",
};

export const accessories: Accessory[] = [
  {
    id: "tr545d-truck-tyre-valve",
    slug: "tr545d-truck-tyre-valve",
    sku: "TR545D",
    name: "TR545D Truck Tyre Valve",
    subtitle: "60° Alloy Wheel Valve",
    category: "valves",
    price: 10,
    // Business-supplied product render (not manufacturer photography); text
    // overlay removed and trimmed to the part. See docs/product-image-sources.md.
    image: "/images/accessories/tr545d-truck-tyre-valve.webp",
    imageAlt: "TR545D 60 degree truck tyre valve for alloy wheels",
    description:
      "TR545D truck tyre valve designed for alloy and aluminium truck wheels. Durable metal construction with a 60° angled stem for easier valve access. Suitable for commercial truck and heavy vehicle wheel applications.",
    metaDescription:
      "Shop the TR545D 60° truck tyre valve for alloy and aluminium truck wheels at Adelaide Wholesale Tyres. Available for $10.00.",
    specs: [
      ["Model", "TR545D"],
      ["Type", "Truck Tyre Valve"],
      ["Angle", "60°"],
      ["Wheel Type", "Alloy / Aluminium Truck Wheels"],
      ["Material", "Metal"],
      ["Style", "Metal clamp-in valve"],
      ["Application", "Truck alloy / aluminium wheels"],
      ["Condition", "New"],
      ["SKU", "TR545D"],
    ],
    keywords: [
      "truck valve",
      "tyre valve",
      "alloy wheel valve",
      "truck tyre accessories",
      "aluminium wheel valve",
      "clamp-in valve",
      "valve stem",
      "accessory",
    ],
  },
];

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export function getAllAccessories(): Accessory[] {
  return accessories;
}

export function getAccessoryBySlug(slug: string): Accessory | undefined {
  return accessories.find((a) => a.slug === slug);
}

/** Every string a catalogue search may match against, lower-cased. */
export function accessorySearchText(accessory: Accessory): string {
  return [
    accessory.sku,
    accessory.name,
    accessory.subtitle,
    ACCESSORY_CATEGORY_LABELS[accessory.category],
    ...accessory.keywords,
  ]
    .join(" ")
    .toLowerCase();
}
