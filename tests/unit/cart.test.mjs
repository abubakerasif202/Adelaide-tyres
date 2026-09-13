import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addLine,
  canCheckout,
  clampQuantity,
  clearCart,
  getCartSubtotal,
  getDeliveryFee,
  getTotalTyreQuantity,
  qualifiesForFreeDelivery,
  removeLine,
  restoreStoredCart,
  updateLineQuantity,
} from "../../lib/cart.ts";

const line = (over = {}) => ({
  id: "a",
  slug: "a",
  brand: "Greforce",
  pattern: "GR881W",
  size: "11R22.5",
  price: 319,
  quantity: 4,
  stock: 100,
  image: null,
  ...over,
});

test("getTotalTyreQuantity sums quantities across lines", () => {
  const cart = { lines: [line({ id: "a", quantity: 2 }), line({ id: "b", quantity: 3 })] };
  assert.equal(getTotalTyreQuantity(cart), 5);
});

test("getCartSubtotal multiplies price by quantity per line", () => {
  const cart = { lines: [line({ price: 300, quantity: 4 }), line({ id: "b", price: 100, quantity: 2 })] };
  assert.equal(getCartSubtotal(cart), 1400);
});

test("canCheckout is true for any non-empty cart — no minimum order", () => {
  assert.equal(canCheckout({ lines: [line({ quantity: 1 })] }), true);
  assert.equal(canCheckout({ lines: [line({ quantity: 100 })] }), true);
});

test("canCheckout is false for an empty cart", () => {
  assert.equal(canCheckout({ lines: [] }), false);
});

test("delivery is $50 for 1-7 tyres, free from 8 tyres up", () => {
  const under = { lines: [line({ quantity: 7 })] };
  const over = { lines: [line({ quantity: 8 })] };
  assert.equal(qualifiesForFreeDelivery(under, { method: "delivery" }), false);
  assert.equal(getDeliveryFee(under, { method: "delivery" }), 50);
  assert.equal(qualifiesForFreeDelivery(over, { method: "delivery" }), true);
  assert.equal(getDeliveryFee(over, { method: "delivery" }), 0);
});

test("pickup is always free regardless of quantity", () => {
  const single = { lines: [line({ quantity: 1 })] };
  assert.equal(qualifiesForFreeDelivery(single, { method: "pickup" }), true);
  assert.equal(getDeliveryFee(single, { method: "pickup" }), 0);
});

test("delivery defaults to the delivery method when no destination is given", () => {
  const under = { lines: [line({ quantity: 3 })] };
  assert.equal(qualifiesForFreeDelivery(under), false);
  assert.equal(getDeliveryFee(under), 50);
});

test("clampQuantity respects min of 1 without treating browser stock as authoritative", () => {
  assert.equal(clampQuantity(0), 1);
  assert.equal(clampQuantity(-3), 1);
  assert.equal(clampQuantity(80), 80);
  assert.equal(clampQuantity(20), 20);
  assert.equal(clampQuantity(2.9), 2);
});

test("addLine merges quantity for an existing product", () => {
  let cart = { lines: [] };
  cart = addLine(cart, line({ quantity: 2 }));
  cart = addLine(cart, line({ quantity: 3 }));
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].quantity, 5);
});

test("addLine keeps cart intent for live inventory validation at checkout", () => {
  let cart = { lines: [] };
  cart = addLine(cart, line({ quantity: 30, stock: 40 }));
  cart = addLine(cart, line({ quantity: 30, stock: 40 }));
  assert.equal(cart.lines[0].quantity, 60);
});

test("updateLineQuantity changes only the targeted line", () => {
  const cart = { lines: [line({ id: "a", quantity: 4 }), line({ id: "b", quantity: 4 })] };
  const next = updateLineQuantity(cart, "b", 9);
  assert.equal(next.lines[0].quantity, 4);
  assert.equal(next.lines[1].quantity, 9);
});

test("removeLine drops the line and returns a new cart", () => {
  const cart = { lines: [line({ id: "a" }), line({ id: "b" })] };
  const next = removeLine(cart, "a");
  assert.equal(next.lines.length, 1);
  assert.equal(next.lines[0].id, "b");
  assert.notEqual(next, cart);
});

test("clearCart empties the cart", () => {
  assert.deepEqual(clearCart(), { lines: [] });
});

test("stored cart restores only current catalogue facts and aggregates duplicate quantities", () => {
  const cart = restoreStoredCart({
    lines: [
      { slug: "greforce-gr881w-11r22-5", quantity: 60, price: 1, stock: 999 },
      { slug: "greforce-gr881w-11r22-5", quantity: 60, price: 1, stock: 999 },
      { slug: "missing", quantity: 1 },
      { slug: "ralson-rmr61-295-80r22-5", quantity: 1.5 },
    ],
  });
  assert.equal(cart.lines.length, 1);
  assert.deepEqual(cart.lines[0], {
    id: "greforce-gr881w-11r225",
    slug: "greforce-gr881w-11r22-5",
    brand: "Greforce",
    pattern: "GR881W",
    size: "11R22.5",
    price: 220,
    quantity: 120,
    image: "/images/tyres/greforce-gr881w-11r22-5.webp",
  });
});
