import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addLine,
  canCheckout,
  clampQuantity,
  clearCart,
  getCartSubtotal,
  getTotalTyreQuantity,
  meetsMinimumOrder,
  qualifiesForFreeDelivery,
  removeLine,
  tyresUntilMinimum,
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

test("minimum order needs 4 tyres total", () => {
  assert.equal(meetsMinimumOrder({ lines: [line({ quantity: 3 })] }), false);
  assert.equal(meetsMinimumOrder({ lines: [line({ quantity: 4 })] }), true);
});

test("mixed products can satisfy the 4 tyre minimum", () => {
  const cart = { lines: [line({ id: "a", quantity: 2 }), line({ id: "b", quantity: 2 })] };
  assert.equal(getTotalTyreQuantity(cart), 4);
  assert.equal(meetsMinimumOrder(cart), true);
  assert.equal(canCheckout(cart), true);
});

test("tyresUntilMinimum counts down and floors at zero", () => {
  assert.equal(tyresUntilMinimum({ lines: [line({ quantity: 1 })] }), 3);
  assert.equal(tyresUntilMinimum({ lines: [line({ quantity: 9 })] }), 0);
});

test("free delivery requires the minimum for delivery, always granted for pickup", () => {
  const under = { lines: [line({ quantity: 2 })] };
  const over = { lines: [line({ quantity: 4 })] };
  assert.equal(qualifiesForFreeDelivery(under, { method: "delivery" }), false);
  assert.equal(qualifiesForFreeDelivery(over, { method: "delivery" }), true);
  assert.equal(qualifiesForFreeDelivery(under, { method: "pickup" }), true);
});

test("canCheckout is false for an empty cart even conceptually", () => {
  assert.equal(canCheckout({ lines: [] }), false);
});

test("clampQuantity respects min of 1 and stock ceiling", () => {
  assert.equal(clampQuantity(0, 50), 1);
  assert.equal(clampQuantity(-3, 50), 1);
  assert.equal(clampQuantity(80, 50), 50);
  assert.equal(clampQuantity(20, 50), 20);
  assert.equal(clampQuantity(2.9, 50), 2);
});

test("addLine merges quantity for an existing product", () => {
  let cart = { lines: [] };
  cart = addLine(cart, line({ quantity: 2 }));
  cart = addLine(cart, line({ quantity: 3 }));
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].quantity, 5);
});

test("addLine clamps merged quantity to stock", () => {
  let cart = { lines: [] };
  cart = addLine(cart, line({ quantity: 30, stock: 40 }));
  cart = addLine(cart, line({ quantity: 30, stock: 40 }));
  assert.equal(cart.lines[0].quantity, 40);
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
