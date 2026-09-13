import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderLines } from "../../lib/order-lines.ts";

const slug = "greforce-gr881w-11r22-5";
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
