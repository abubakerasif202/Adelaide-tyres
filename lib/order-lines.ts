import { getTyreBySlug } from "./catalogue.ts";
import { inventoryMappingIdForProduct } from "./inventory/mapping.ts";

/** Resolve authoritative prices; 247 atomically validates live inventory later. */
export function validateOrderLines(input: unknown) {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "Your cart is empty." } as const;
  }
  const quantities = new Map<string, number>();
  for (const item of input) {
    if (!item || typeof item !== "object" || typeof item.slug !== "string" ||
      typeof item.quantity !== "number" || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      return { error: "One or more items are no longer available." } as const;
    }
    quantities.set(item.slug, (quantities.get(item.slug) ?? 0) + item.quantity);
  }
  const lines = [];
  for (const [slug, quantity] of quantities) {
    const tyre = getTyreBySlug(slug);
    if (!tyre || quantity > 1000) return { error: "One or more items are no longer available." } as const;
    if (!inventoryMappingIdForProduct(tyre.id)) return { error: `${tyre.brand} ${tyre.pattern} ${tyre.size} requires availability confirmation. Please contact us.` } as const;
    lines.push({ id: tyre.id, brand: tyre.brand, pattern: tyre.pattern, size: tyre.size, quantity, price: tyre.price });
  }
  return { lines } as const;
}
