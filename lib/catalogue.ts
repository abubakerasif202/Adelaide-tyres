/**
 * Typed product catalogue. This is the single source of truth for products,
 * pricing and stock. UI components read from here via the helpers at the bottom
 * so prices and inventory can change without touching components.
 *
 * Pricing and stock below are real, business-supplied wholesale figures.
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
  /** Wholesale price per tyre, ex GST, in AUD. */
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
 * Supplied inventory. Prices and stock are real business-supplied figures.
 * `image` points at a locally hosted product photo where the exact model could be
 * verified against manufacturer imagery (see docs/product-image-sources.md), and is
 * null otherwise so the neutral placeholder renders. Only add an image here once the
 * exact model/pattern is confirmed — never a generic or substitute tyre.
 *
 * `position`/`loadIndex`/`speedRating`/`construction` are left unset unless
 * independently verified — they are not fabricated from the size/pattern alone.
 */
export const catalogue: Tyre[] = [
  // Ralson
  {
    id: "ralson-rdr75-26570r195",
    slug: "ralson-rdr75-265-70r19-5",
    brand: "Ralson",
    pattern: "RDR75",
    size: "265/70R19.5",
    application: "commercial",
    stock: 8,
    price: 390,
    image: "/images/tyres/ralson-rdr75-265-70r19-5.webp",
    description: "265/70R19.5 radial for light-to-medium commercial trucks running metro and regional routes.",
    featured: false,
  },
  {
    id: "ralson-rmr61-26570r195",
    slug: "ralson-rmr61-265-70r19-5",
    brand: "Ralson",
    pattern: "RMR61",
    size: "265/70R19.5",
    application: "commercial",
    stock: 7,
    price: 380,
    image: "/images/tyres/ralson-rmr61-265-70r19-5.webp",
    description: "265/70R19.5 radial for medium-duty commercial trucks and rigids.",
    featured: false,
  },
  {
    id: "ralson-rmr61-29580r225",
    slug: "ralson-rmr61-295-80r22-5",
    brand: "Ralson",
    pattern: "RMR61",
    size: "295/80R22.5",
    application: "truck",
    stock: 51,
    price: 450,
    image: "/images/tyres/ralson-rmr61-295-80r22-5.webp",
    description: "295/80R22.5 radial for rigid trucks and prime movers on metro and regional runs.",
    featured: true,
    badge: "High stock",
  },
  {
    id: "ralson-rdr75-29580r225",
    slug: "ralson-rdr75-295-80r22-5",
    brand: "Ralson",
    pattern: "RDR75",
    size: "295/80R22.5",
    application: "truck",
    stock: 16,
    price: 550,
    image: "/images/tyres/ralson-rdr75-295-80r22-5.webp",
    description: "295/80R22.5 radial for trucks and prime movers on regional and highway routes.",
    featured: false,
  },
  {
    id: "ralson-rmr61-38565r225",
    slug: "ralson-rmr61-385-65r22-5",
    brand: "Ralson",
    pattern: "RMR61",
    size: "385/65R22.5",
    application: "truck",
    stock: 16,
    price: 690,
    image: "/images/tyres/ralson-rmr61-385-65r22-5.webp",
    description: "385/65R22.5 wide-base radial for trucks and prime movers on highway freight work.",
    featured: false,
  },
  {
    id: "ralson-rtr71-11r225",
    slug: "ralson-rtr71-11r22-5",
    brand: "Ralson",
    pattern: "RTR71",
    size: "11R22.5",
    application: "truck",
    stock: 17,
    price: 330,
    image: "/images/tyres/ralson-rtr71-11r22-5.webp",
    description: "11R22.5 radial truck tyre for regional and highway line-haul work.",
    featured: false,
  },
  {
    id: "ralson-rdr52-11r225",
    slug: "ralson-rdr52-11r22-5",
    brand: "Ralson",
    pattern: "RDR52",
    size: "11R22.5",
    application: "truck",
    stock: 16,
    price: 380,
    image: "/images/tyres/ralson-rdr52-11r22-5.webp",
    description: "11R22.5 radial for trucks and prime movers on regional and highway routes.",
    featured: false,
  },
  {
    id: "ralson-rdr55-11r225",
    slug: "ralson-rdr55-11r22-5",
    brand: "Ralson",
    pattern: "RDR55",
    size: "11R22.5",
    application: "truck",
    stock: 36,
    price: 385,
    image: "/images/tyres/ralson-rdr55-11r22-5.webp",
    description: "11R22.5 radial for trucks and prime movers running regional and highway freight.",
    featured: true,
    badge: "High stock",
  },
  {
    id: "ralson-rdc66-11r225",
    slug: "ralson-rdc66-11r22-5",
    brand: "Ralson",
    pattern: "RDC66",
    size: "11R22.5",
    application: "truck",
    stock: 16,
    price: 430,
    image: "/images/tyres/ralson-rdc66-11r22-5.webp",
    description: "11R22.5 radial for trucks and prime movers on metro and regional routes.",
    featured: false,
  },
  {
    id: "ralson-rac55-11r225",
    slug: "ralson-rac55-11r22-5",
    brand: "Ralson",
    pattern: "RAC55",
    size: "11R22.5",
    application: "truck",
    stock: 22,
    price: 395,
    image: "/images/tyres/ralson-rac55-11r22-5.webp",
    description: "11R22.5 radial for trucks and prime movers running highway and regional freight.",
    featured: false,
  },
  {
    id: "ralson-rdr75-23575r175",
    slug: "ralson-rdr75-235-75r17-5",
    brand: "Ralson",
    pattern: "RDR75",
    size: "235/75R17.5",
    application: "commercial",
    stock: 16,
    price: 290,
    image: "/images/tyres/ralson-rdr75-235-75r17-5.webp",
    description: "235/75R17.5 radial for light-to-medium commercial trucks on metro and regional runs.",
    featured: false,
  },
  {
    id: "ralson-rmr61-23575r175",
    slug: "ralson-rmr61-235-75r17-5",
    brand: "Ralson",
    pattern: "RMR61",
    size: "235/75R17.5",
    application: "commercial",
    stock: 16,
    price: 299,
    image: "/images/tyres/ralson-rmr61-235-75r17-5.webp",
    description: "235/75R17.5 radial for medium-duty commercial trucks and rigids.",
    featured: false,
  },
  {
    id: "ralson-rmr61-27570r225",
    slug: "ralson-rmr61-275-70r22-5",
    brand: "Ralson",
    pattern: "RMR61",
    size: "275/70R22.5",
    application: "truck",
    stock: 3,
    price: 450,
    image: "/images/tyres/ralson-rmr61-275-70r22-5.webp",
    description: "275/70R22.5 low-profile radial for medium commercial trucks and buses on urban routes.",
    featured: false,
  },

  // Greforce
  {
    id: "greforce-hd02-11r225",
    slug: "greforce-hd02-11r22-5",
    brand: "Greforce",
    pattern: "HD02",
    size: "11R22.5",
    application: "truck",
    stock: 8,
    price: 385,
    image: "/images/tyres/greforce-hd02-11r22-5.webp",
    description: "11R22.5 heavy-duty radial for trucks and prime movers running regional freight.",
    featured: false,
  },
  {
    id: "greforce-gr881w-11r225",
    slug: "greforce-gr881w-11r22-5",
    brand: "Greforce",
    pattern: "GR881W",
    size: "11R22.5",
    application: "truck",
    stock: 107,
    price: 220,
    image: "/images/tyres/greforce-gr881w-11r22-5.webp",
    description: "11R22.5 radial truck tyre for regional and highway line-haul work.",
    featured: true,
    badge: "High stock",
  },
  {
    id: "greforce-grd1919-11r225",
    slug: "greforce-grd1919-11r22-5",
    brand: "Greforce",
    pattern: "GRD1919",
    size: "11R22.5",
    application: "truck",
    stock: 37,
    price: 350,
    image: "/images/tyres/greforce-grd1919-11r22-5.webp",
    description: "11R22.5 radial for trucks and prime movers running regional and highway freight.",
    featured: true,
    badge: "Current stock",
  },
  {
    id: "greforce-g-pilot-x1-29580r225",
    slug: "greforce-g-pilot-x1-295-80r22-5",
    brand: "Greforce",
    pattern: "G-PILOT X1",
    size: "295/80R22.5",
    application: "truck",
    position: "steer",
    stock: 37,
    price: 399,
    image: "/images/tyres/greforce-g-pilot-295-80r22-5.webp",
    description: "295/80R22.5 steer radial for prime movers and rigids. Four straight grooves and a wide running surface for even wear on regional and highway routes.",
    featured: false,
  },
  {
    id: "greforce-grt33-95r175",
    slug: "greforce-grt33-9-5r17-5",
    brand: "Greforce",
    pattern: "GRT33",
    size: "9.5R17.5",
    application: "commercial",
    stock: 9,
    price: 185,
    image: "/images/tyres/greforce-grt33-9-5r17-5.webp",
    description: "9.5R17.5 radial for light commercial trucks on metro delivery routes.",
    featured: false,
  },
  {
    id: "greforce-grt33-23575r175",
    slug: "greforce-grt33-235-75r17-5",
    brand: "Greforce",
    pattern: "GRT33",
    size: "235/75R17.5",
    application: "commercial",
    stock: 13,
    price: 180,
    image: "/images/tyres/greforce-grt33-235-75r17-5.webp",
    description: "235/75R17.5 radial for light-to-medium commercial trucks on metro and regional runs.",
    featured: false,
  },

  // Jumbo
  {
    id: "jumbo-ss398-29580r225",
    slug: "jumbo-ss398-295-80r22-5",
    brand: "Jumbo",
    pattern: "SS398",
    size: "295/80R22.5",
    application: "truck",
    stock: 18,
    price: 290,
    image: null,
    description: "295/80R22.5 radial for trucks and prime movers on regional and highway routes.",
    featured: false,
  },

  // Opartner
  {
    id: "opartner-cp989-26570r195",
    slug: "opartner-cp989-265-70r19-5",
    brand: "Opartner",
    pattern: "CP989",
    size: "265/70R19.5",
    application: "commercial",
    stock: 7,
    price: 220,
    image: "/images/tyres/opartner-cp989-265-70r19-5.webp",
    description: "265/70R19.5 radial for light-to-medium commercial trucks on metro and regional runs.",
    featured: false,
  },

  // Haulmax
  {
    id: "haulmax-att101-11r225",
    slug: "haulmax-att101-11r22-5",
    brand: "Haulmax",
    pattern: "ATT101",
    size: "11R22.5",
    application: "truck",
    stock: 6,
    price: 385,
    image: "/images/tyres/haulmax-att101-11r22-5.webp",
    description: "11R22.5 radial for trucks and prime movers running regional and highway freight.",
    featured: false,
  },
  {
    id: "haulmax-att101-27570r225",
    slug: "haulmax-att101-275-70r22-5",
    brand: "Haulmax",
    pattern: "ATT101",
    size: "275/70R22.5",
    application: "commercial",
    stock: 5,
    price: 340,
    image: "/images/tyres/haulmax-att101-275-70r22-5.webp",
    description: "275/70R22.5 low-profile radial for medium commercial trucks and buses on urban routes.",
    featured: false,
  },
  {
    id: "haulmax-att420-29580r225",
    slug: "haulmax-att420-295-80r22-5",
    brand: "Haulmax",
    pattern: "ATT420",
    size: "295/80R22.5",
    application: "truck",
    stock: 2,
    price: 490,
    image: "/images/tyres/haulmax-att420-295-80r22-5.webp",
    description: "295/80R22.5 radial for trucks and prime movers on regional and highway routes.",
    featured: false,
  },

  // Sailun
  {
    id: "sailun-sfr22-38565r225",
    slug: "sailun-sfr22-385-65r22-5",
    brand: "Sailun",
    pattern: "SFR22",
    size: "385/65R22.5",
    application: "truck",
    stock: 2,
    price: 430,
    image: "/images/tyres/sailun-sfr22-385-65r22-5.webp",
    description: "385/65R22.5 wide-base radial for trucks and prime movers on highway freight work.",
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
