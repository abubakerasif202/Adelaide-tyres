/**
 * Pure cart + order business logic. No React, no storage — safe to unit test
 * and to reuse on the server. UI state (the provider) lives in cart-context.tsx.
 */

// Explicit .ts extension so Node's test runner can resolve this at runtime.
import { order } from "./config.ts";

export type CartLine = {
  id: string;
  slug: string;
  brand: string;
  pattern: string;
  size: string;
  /** Unit wholesale price at time of adding, in AUD. */
  price: number;
  quantity: number;
  /** Units available — used to clamp quantity. */
  stock: number;
  image: string | null;
};

export type Cart = {
  lines: CartLine[];
};

export const MIN_QTY_PER_LINE = 1;

/** THE authoritative helper. Total tyre quantity across the whole cart. */
export function getTotalTyreQuantity(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function getCartSubtotal(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function getLineSubtotal(line: CartLine): number {
  return line.price * line.quantity;
}

/** Does the cart meet the business minimum (>= 4 tyres total)? */
export function meetsMinimumOrder(cart: Cart): boolean {
  return getTotalTyreQuantity(cart) >= order.minimumTyres;
}

/** How many more tyres are needed to reach the minimum (0 once met). */
export function tyresUntilMinimum(cart: Cart): number {
  return Math.max(0, order.minimumTyres - getTotalTyreQuantity(cart));
}

export type DeliveryMethod = "delivery" | "pickup";

export type DeliveryDestination = {
  method: DeliveryMethod;
  postcode?: string;
};

/**
 * Free delivery qualification. For this release the business rule is
 * Adelaide-wide free delivery once the tyre minimum is met. Pickup is always free.
 * Centralised here so the rule can tighten later (e.g. a postcode allow-list)
 * without touching UI.
 */
export function qualifiesForFreeDelivery(
  cart: Cart,
  destination: DeliveryDestination = { method: "delivery" },
): boolean {
  if (destination.method === "pickup") return true;
  return getTotalTyreQuantity(cart) >= order.freeDelivery.qualifyingTyres;
}

export function canCheckout(cart: Cart): boolean {
  return cart.lines.length > 0 && meetsMinimumOrder(cart);
}

export function clampQuantity(quantity: number, stock: number): number {
  if (!Number.isFinite(quantity)) return MIN_QTY_PER_LINE;
  const rounded = Math.floor(quantity);
  if (rounded < MIN_QTY_PER_LINE) return MIN_QTY_PER_LINE;
  if (stock > 0 && rounded > stock) return stock;
  return rounded;
}

type AddInput = Omit<CartLine, "quantity"> & { quantity: number };

export function addLine(cart: Cart, input: AddInput): Cart {
  const existing = cart.lines.find((l) => l.id === input.id);
  if (existing) {
    return updateLineQuantity(cart, input.id, existing.quantity + input.quantity);
  }
  return {
    lines: [
      ...cart.lines,
      { ...input, quantity: clampQuantity(input.quantity, input.stock) },
    ],
  };
}

export function updateLineQuantity(cart: Cart, id: string, quantity: number): Cart {
  return {
    lines: cart.lines.map((line) =>
      line.id === id
        ? { ...line, quantity: clampQuantity(quantity, line.stock) }
        : line,
    ),
  };
}

export function removeLine(cart: Cart, id: string): Cart {
  return { lines: cart.lines.filter((line) => line.id !== id) };
}

export function clearCart(): Cart {
  return { lines: [] };
}

export const EMPTY_CART: Cart = { lines: [] };
