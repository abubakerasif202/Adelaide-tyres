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

export type DeliveryMethod = "delivery" | "pickup";

export type DeliveryDestination = {
  method: DeliveryMethod;
  postcode?: string;
};

/**
 * Free delivery qualification. No minimum order — the business rule is a flat
 * Adelaide-wide delivery fee under 8 tyres, free from 8 tyres up. Pickup is
 * always free. Centralised here so the rule can tighten later (e.g. a
 * postcode allow-list) without touching UI.
 */
export function qualifiesForFreeDelivery(
  cart: Cart,
  destination: DeliveryDestination = { method: "delivery" },
): boolean {
  if (destination.method === "pickup") return true;
  return getTotalTyreQuantity(cart) >= order.delivery.freeQualifyingTyres;
}

/** Delivery fee in AUD for the given cart/destination — $0 for pickup or 8+ tyres. */
export function getDeliveryFee(
  cart: Cart,
  destination: DeliveryDestination = { method: "delivery" },
): number {
  return qualifiesForFreeDelivery(cart, destination) ? 0 : order.delivery.feeAud;
}

/** No minimum order — checkout is available as soon as the cart has an item. */
export function canCheckout(cart: Cart): boolean {
  return cart.lines.length > 0;
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
