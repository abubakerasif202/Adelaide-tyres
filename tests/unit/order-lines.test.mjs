import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getTyreOrderLines,
  getValidatedTyreQuantity,
  validateOrderLines,
} from "../../lib/order-lines.ts";

const slug = "greforce-gr881w-11r22-5";
const valveSlug = "tr545d-truck-tyre-valve";

test("server accepts one tyre and uses catalogue price", () => {
  const result = validateOrderLines([{ slug, quantity: 1, price: 1 }]);
  assert.equal(result.lines[0].price, 220);
  assert.equal(result.lines[0].quantity, 1);
});

test("duplicate SKU quantities aggregate for one atomic 247 reservation", () => {
  const combined = validateOrderLines([{ slug, quantity: 60 }, { slug, quantity: 60 }]);
  assert.equal(combined.lines[0].quantity, 120);
  const result = validateOrderLines([{ slug, quantity: 3 }, { slug, quantity: 4 }]);
  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0].quantity, 7);
});

test("server rejects invalid and fractional quantities and malformed lines", () => {
  for (const quantity of [0, -1, 1.5, "1", Infinity, NaN, 1001]) {
    assert.ok(validateOrderLines([{ slug, quantity }]).error);
  }
  for (const input of [null, [], [null], [{}], [{ slug: "missing", quantity: 1 }]]) {
    assert.ok(validateOrderLines(input).error);
  }
});

test("the intentionally unmapped Greforce G-PILOT X1 295/80R22.5 cannot be ordered online", () => {
  const result = validateOrderLines([{ slug: "greforce-g-pilot-x1-295-80r22-5", quantity: 1 }]);
  assert.match(result.error, /availability confirmation|contact us/i);
  // It must not be silently dropped or mapped onto a similar Greforce tyre.
  const mixed = validateOrderLines([{ slug, quantity: 1 }, { slug: "greforce-g-pilot-x1-295-80r22-5", quantity: 1 }]);
  assert.ok(mixed.error);
});

test("browser-supplied prices and inventory identifiers are ignored; the server catalogue wins", () => {
  const result = validateOrderLines([{ slug, quantity: 2, price: 0.01, inventoryMappingId: "00000000-0000-4000-8000-000000000000", id: "some-other-tyre" }]);
  assert.equal(result.lines[0].price, 220);
  assert.equal(result.lines[0].id, "greforce-gr881w-11r225", "catalogue id, never the browser id");
  assert.deepEqual(Object.keys(result.lines[0]).sort(), ["brand", "id", "pattern", "price", "quantity", "size"]);
});

test("TR545D is validated server-side at $10 and does not require a 247 tyre mapping", () => {
  const result = validateOrderLines([{ slug: valveSlug, quantity: 3, price: 0.01, id: "forged" }]);
  assert.ok(!result.error);
  assert.equal(result.lines.length, 1);
  assert.deepEqual(result.lines[0], {
    id: "tr545d-truck-tyre-valve",
    brand: "TR545D",
    pattern: "TR545D Truck Tyre Valve",
    size: "60° Alloy Wheel Valve",
    quantity: 3,
    price: 10,
  });
  assert.equal(getTyreOrderLines(result.lines).length, 0);
  assert.equal(getValidatedTyreQuantity(result.lines), 0);
});

test("mixed carts reserve/count only the tyre portion", () => {
  const result = validateOrderLines([
    { slug, quantity: 7 },
    { slug: valveSlug, quantity: 20 },
  ]);
  assert.ok(!result.error);
  assert.equal(result.lines.length, 2);
  assert.equal(getTyreOrderLines(result.lines).length, 1);
  assert.equal(getTyreOrderLines(result.lines)[0].id, "greforce-gr881w-11r225");
  assert.equal(getValidatedTyreQuantity(result.lines), 7);
});
