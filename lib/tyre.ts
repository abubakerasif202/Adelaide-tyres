import type { Tyre } from "./catalogue";

/** Short display name: "Greforce GR881W 11R22.5". */
export function tyreFullName(tyre: Pick<Tyre, "brand" | "pattern" | "size">): string {
  return `${tyre.brand} ${tyre.pattern} ${tyre.size}`;
}

/** SEO title-friendly name. */
export function tyreSeoName(tyre: Pick<Tyre, "brand" | "pattern" | "size">): string {
  return `${tyre.brand} ${tyre.pattern} ${tyre.size} Wholesale Tyre`;
}
