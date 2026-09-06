/**
 * Typed product catalogue. This is the single source of truth for products,
 * pricing and stock. UI components read from here via the helpers at the bottom
 * so prices and inventory can change without touching components.
 *
 * Pricing below is TEST / PLACEHOLDER data supplied for build purposes.
 */

export type TyreApplication =
  | "truck"
  | "commercial"
  | "light-commercial"
  | "passenger"
  | "all-terrain";

export type TyrePosition = "steer" | "drive" | "trailer" | "all-position";

export type Tyre = {
  id: string;
  slug: string;
  brand: string;
  pattern: string;
  size: string;
  application: TyreApplication;
  position?: TyrePosition;
  /** Units available to order right now. */
  stock: number;
  /** Wholesale price per tyre, ex GST, in AUD. TEST VALUE. */
  price: number;
  /** Path under /public, or null to render the neutral tyre placeholder. */
  image: string | null;
  description: string;
  featured: boolean;
  badge?: string;
  loadIndex?: string;
  speedRating?: string;
  construction?: string;
};

/**
 * Supplied priority inventory. Prices are placeholders pending real wholesale rates.
 * No verified product photography is available, so `image` is null and the
 * neutral placeholder renders — replace with real photos when supplied.
 */
export const catalogue: Tyre[] = [
  {
    id: "greforce-gr881w-11r225",
    slug: "greforce-gr881w-11r22-5",
    brand: "Greforce",
    pattern: "GR881W",
    size: "11R22.5",
    application: "truck",
    position: "drive",
    stock: 107,
    price: 319,
    image: null,
    description:
      "Radial truck drive tyre in the common 11R22.5 fitment for regional and highway line-haul work. Deep block tread for traction on drive axles.",
    featured: true,
    badge: "Best stock",
  },
  {
    id: "greforce-g-armor-11r225",
    slug: "greforce-g-armor-11r22-5",
    brand: "Greforce",
    pattern: "G-ARMOR",
    size: "11R22.5",
    application: "truck",
    position: "all-position",
    stock: 74,
    price: 329,
    image: null,
    description:
      "All-position 11R22.5 radial suited to mixed steer and trailer fitment on rigid trucks and prime movers running metro and regional routes.",
    featured: true,
    badge: "Heavy duty",
  },
  {
    id: "ralson-rmr61-29580r225",
    slug: "ralson-rmr61-295-80r22-5",
    brand: "Ralson",
    pattern: "RMR61",
    size: "295/80R22.5",
    application: "truck",
    position: "all-position",
    stock: 51,
    price: 379,
    image: null,
    description:
      "295/80R22.5 all-position radial for rigid trucks and prime movers. Even wear pattern for high-kilometre metro and regional operators.",
    featured: true,
    badge: "Popular",
  },
  {
    id: "jumbo-ss618-27570r225",
    slug: "jumbo-ss618-275-70r22-5",
    brand: "Jumbo",
    pattern: "SS618",
    size: "275/70R22.5",
    application: "commercial",
    position: "drive",
    stock: 40,
    price: 349,
    image: null,
    description:
      "275/70R22.5 low-profile drive tyre for medium commercial trucks and buses working urban distribution routes.",
    featured: false,
    badge: "Commercial",
  },
  {
    id: "ralson-rac55-29580r225",
    slug: "ralson-rac55-295-80r22-5",
    brand: "Ralson",
    pattern: "RAC55",
    size: "295/80R22.5",
    application: "truck",
    position: "steer",
    stock: 38,
    price: 389,
    image: null,
    description:
      "295/80R22.5 steer-axle radial with rib tread for stable tracking and long, even front-axle wear on highway work.",
    featured: false,
  },
  {
    id: "greforce-g-pilot-29580r225",
    slug: "greforce-g-pilot-295-80r22-5",
    brand: "Greforce",
    pattern: "G-PILOT",
    size: "295/80R22.5",
    application: "truck",
    position: "steer",
    stock: 37,
    price: 359,
    image: null,
    description:
      "295/80R22.5 steer radial for prime movers and rigids. Five-rib tread for predictable handling on regional and highway routes.",
    featured: false,
  },
];

// ---------------------------------------------------------------------------
// Read helpers — components and pages use these, never the array directly.
// ---------------------------------------------------------------------------

export function getAllTyres(): Tyre[] {
  return catalogue;
}

export function getTyreBySlug(slug: string): Tyre | undefined {
  return catalogue.find((t) => t.slug === slug);
}

export function getFeaturedTyres(): Tyre[] {
  return catalogue.filter((t) => t.featured);
}

export function getRelatedTyres(tyre: Tyre, limit = 3): Tyre[] {
  return catalogue
    .filter((t) => t.id !== tyre.id)
    .sort((a, b) => {
      const score = (t: Tyre) =>
        (t.size === tyre.size ? 2 : 0) + (t.application === tyre.application ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export const catalogueStats = {
  get skuLines() {
    return catalogue.length;
  },
  get unitsListed() {
    return catalogue.reduce((sum, t) => sum + t.stock, 0);
  },
};

export const APPLICATION_LABELS: Record<TyreApplication, string> = {
  truck: "Truck",
  commercial: "Commercial",
  "light-commercial": "Light commercial",
  passenger: "Passenger",
  "all-terrain": "All-terrain",
};

export function uniqueSizes(): string[] {
  return [...new Set(catalogue.map((t) => t.size))].sort();
}

export function uniqueBrands(): string[] {
  return [...new Set(catalogue.map((t) => t.brand))].sort();
}

export function uniqueApplications(): TyreApplication[] {
  return [...new Set(catalogue.map((t) => t.application))];
}
