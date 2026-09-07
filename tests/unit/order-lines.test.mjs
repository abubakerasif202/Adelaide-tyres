import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderLines } from "../../lib/order-lines.ts";

const slug = "greforce-gr881w-11r22-5";
test("server accepts one tyre and uses catalogue price", () => {
  const result = validateOrderLines([{ slug, quantity: 1, price: 1 }]);
  assert.equal(result.lines[0].price, 220);
  assert.equal(result.lines[0].quantity, 1);
});
test("duplicate SKU quantities cannot bypass stock validation", () => {
  assert.match(validateOrderLines([{ slug, quantity: 60 }, { slug, quantity: 60 }]).error, /Only 107/);
  const result = validateOrderLines([{ slug, quantity: 3 }, { slug, quantity: 4 }]);
  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0].quantity, 7);
});
test("server rejects invalid and fractional quantities and malformed lines", () => {
  for (const quantity of [0, -1, 1.5, "1", Infinity, NaN, 108]) {
    assert.ok(validateOrderLines([{ slug, quantity }]).error);
  }
  for (const input of [null, [], [null], [{}], [{ slug: "missing", quantity: 1 }]]) {
    assert.ok(validateOrderLines(input).error);
  }
});
