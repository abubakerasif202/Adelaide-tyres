import type { Tyre, TyreApplication } from "./catalogue";

export type TyreFilters = {
  query: string;
  size: string | null;
  brand: string | null;
  application: TyreApplication | null;
  inStockOnly: boolean;
  sort: "featured" | "price-asc" | "price-desc" | "stock-desc";
};

export const DEFAULT_FILTERS: TyreFilters = {
  query: "",
  size: null,
  brand: null,
  application: null,
  inStockOnly: false,
  sort: "featured",
};

function matchesQuery(tyre: Tyre, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [tyre.brand, tyre.pattern, tyre.size, tyre.application]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function filterTyres(tyres: Tyre[], filters: TyreFilters): Tyre[] {
  const result = tyres.filter((tyre) => {
    if (!matchesQuery(tyre, filters.query)) return false;
    if (filters.size && tyre.size !== filters.size) return false;
    if (filters.brand && tyre.brand !== filters.brand) return false;
    if (filters.application && tyre.application !== filters.application) return false;
    if (filters.inStockOnly && tyre.stock <= 0) return false;
    return true;
  });

  const sorted = [...result];
  switch (filters.sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "stock-desc":
      sorted.sort((a, b) => b.stock - a.stock);
      break;
    default:
      sorted.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || b.stock - a.stock,
      );
  }
  return sorted;
}

/** Read filters from URLSearchParams (used for shareable/bookmarkable state). */
export function filtersFromParams(params: URLSearchParams): TyreFilters {
  const sortParam = params.get("sort");
  const validSorts: TyreFilters["sort"][] = [
    "featured",
    "price-asc",
    "price-desc",
    "stock-desc",
  ];
  return {
    query: params.get("q") ?? "",
    size: params.get("size"),
    brand: params.get("brand"),
    application: (params.get("application") as TyreApplication | null) ?? null,
    inStockOnly: params.get("stock") === "in",
    sort: validSorts.includes(sortParam as TyreFilters["sort"])
      ? (sortParam as TyreFilters["sort"])
      : "featured",
  };
}

export function paramsFromFilters(filters: TyreFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query);
  if (filters.size) params.set("size", filters.size);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.application) params.set("application", filters.application);
  if (filters.inStockOnly) params.set("stock", "in");
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params;
}

export function activeFilterCount(filters: TyreFilters): number {
  return (
    (filters.query.trim() ? 1 : 0) +
    (filters.size ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.application ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0)
  );
}
