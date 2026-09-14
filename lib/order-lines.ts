import { getTyreBySlug } from "./catalogue.ts";
import { getAccessoryBySlug } from "./accessories.ts";
import { inventoryMappingIdForProduct } from "./inventory/mapping.ts";

/** Resolve authoritative prices; 247 atomically validates live tyre inventory later. */
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

  const lines: {
    id: string;
    kind?: "tyre" | "accessory";
    brand: string;
    pattern: string;
    size: string;
    quantity: number;
    price: number;
  }[] = [];

  for (const [slug, quantity] of quantities) {
    if (quantity > 1000) return { error: "One or more items are no longer available." } as const;

    const tyre = getTyreBySlug(slug);
    if (tyre) {
      if (!inventoryMappingIdForProduct(tyre.id)) {
        return { error: `${tyre.brand} ${tyre.pattern} ${tyre.size} requires availability confirmation. Please contact us.` } as const;
      }
      // Keep the legacy tyre line shape unchanged. Undefined kind means tyre;
      // only non-tyre lines need an explicit discriminator.
      lines.push({
        id: tyre.id,
        brand: tyre.brand,
        pattern: tyre.pattern,
        size: tyre.size,
        quantity,
        price: tyre.price,
      });
      continue;
    }

    const accessory = getAccessoryBySlug(slug);
    if (accessory) {
      lines.push({
        id: accessory.id,
        kind: "accessory",
        brand: accessory.sku,
        pattern: accessory.name.replace(`${accessory.sku} `, ""),
        size: accessory.subtitle,
        quantity,
        price: accessory.price,
      });
      continue;
    }

    return { error: "One or more items are no longer available." } as const;
  }

  return { lines } as const;
}
