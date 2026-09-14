import { getTyreBySlug } from "./catalogue.ts";
import { getAccessoryById, getAccessoryBySlug } from "./accessories.ts";
import { inventoryMappingIdForProduct } from "./inventory/mapping.ts";

export type ValidatedOrderLine = {
  id: string;
  brand: string;
  pattern: string;
  size: string;
  quantity: number;
  price: number;
};

/** Resolve authoritative prices; 247 atomically validates tyre inventory later. */
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

  const lines: ValidatedOrderLine[] = [];
  for (const [slug, quantity] of quantities) {
    if (quantity > 1000) return { error: "One or more items are no longer available." } as const;

    const tyre = getTyreBySlug(slug);
    if (tyre) {
      if (!inventoryMappingIdForProduct(tyre.id)) {
        return { error: `${tyre.brand} ${tyre.pattern} ${tyre.size} requires availability confirmation. Please contact us.` } as const;
      }
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
    if (!accessory?.purchasable) {
      return { error: "One or more items are no longer available." } as const;
    }
    lines.push({
      id: accessory.id,
      brand: accessory.sku,
      pattern: accessory.name,
      size: accessory.subtitle,
      quantity,
      price: accessory.price,
    });
  }

  return { lines } as const;
}

/** Lines that must be reserved/committed in the external 247 tyre inventory. */
export function getTyreOrderLines(lines: ValidatedOrderLine[]): ValidatedOrderLine[] {
  return lines.filter((line) => !getAccessoryById(line.id));
}

/** Tyre-only quantity used by the 8+ free-delivery business rule. */
export function getValidatedTyreQuantity(lines: ValidatedOrderLine[]): number {
  return getTyreOrderLines(lines).reduce((sum, line) => sum + line.quantity, 0);
}
