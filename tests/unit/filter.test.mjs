import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  filterTyres,
  filtersFromParams,
  paramsFromFilters,
} from "../../lib/filter.ts";

const tyre = (over = {}) => ({
  id: "x",
  slug: "x",
  brand: "Greforce",
  pattern: "GR881W",
  size: "11R22.5",
  application: "truck",
  stock: 10,
  price: 300,
  image: null,
  description: "",
  featured: false,
  ...over,
});

const data = [
  tyre({ id: "a", brand: "Greforce", pattern: "GR881W", size: "11R22.5", price: 319, stock: 107, featured: true }),
  tyre({ id: "b", brand: "Ralson", pattern: "RMR61", size: "295/80R22.5", price: 379, stock: 51 }),
  tyre({ id: "c", brand: "Jumbo", pattern: "SS618", size: "275/70R22.5", price: 349, stock: 0, application: "commercial" }),
];

test("empty filters return everything", () => {
  assert.equal(filterTyres(data, DEFAULT_FILTERS).length, 3);
});

test("query matches brand, size or pattern (case-insensitive)", () => {
  assert.equal(filterTyres(data, { ...DEFAULT_FILTERS, query: "ralson" }).length, 1);
  assert.equal(filterTyres(data, { ...DEFAULT_FILTERS, query: "295/80" }).length, 1);
  assert.equal(filterTyres(data, { ...DEFAULT_FILTERS, query: "GR881W" }).length, 1);
});

test("size and brand filters combine", () => {
  const out = filterTyres(data, { ...DEFAULT_FILTERS, size: "11R22.5", brand: "Greforce" });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "a");
});

test("application filter narrows results", () => {
  assert.equal(filterTyres(data, { ...DEFAULT_FILTERS, application: "commercial" }).length, 1);
});

test("inStockOnly hides zero-stock lines", () => {
  assert.equal(filterTyres(data, { ...DEFAULT_FILTERS, inStockOnly: true }).length, 2);
});

test("price sorting works both directions", () => {
  const asc = filterTyres(data, { ...DEFAULT_FILTERS, sort: "price-asc" });
  assert.deepEqual(asc.map((t) => t.price), [319, 349, 379]);
  const desc = filterTyres(data, { ...DEFAULT_FILTERS, sort: "price-desc" });
  assert.deepEqual(desc.map((t) => t.price), [379, 349, 319]);
});

test("featured sort puts featured first", () => {
  const out = filterTyres(data, { ...DEFAULT_FILTERS, sort: "featured" });
  assert.equal(out[0].id, "a");
});

test("no match returns empty array", () => {
  assert.deepEqual(filterTyres(data, { ...DEFAULT_FILTERS, query: "nonexistent" }), []);
});

test("filters round-trip through URL params", () => {
  const filters = {
    query: "steer",
    size: "295/80R22.5",
    brand: "Ralson",
    application: "truck",
    inStockOnly: true,
    sort: "price-asc",
  };
  const params = paramsFromFilters(filters);
  const restored = filtersFromParams(new URLSearchParams(params.toString()));
  assert.deepEqual(restored, filters);
});

test("default filters produce an empty query string", () => {
  assert.equal(paramsFromFilters(DEFAULT_FILTERS).toString(), "");
});

test("activeFilterCount ignores sort", () => {
  assert.equal(activeFilterCount({ ...DEFAULT_FILTERS, sort: "price-asc" }), 0);
  assert.equal(activeFilterCount({ ...DEFAULT_FILTERS, brand: "Ralson", inStockOnly: true }), 2);
});

test("multi-word query round-trips through URL params with interior space intact", () => {
  const filters = { ...DEFAULT_FILTERS, query: "Ralson RDR" };
  const params = paramsFromFilters(filters);
  assert.equal(params.get("q"), "Ralson RDR");
  const restored = filtersFromParams(new URLSearchParams(params.toString()));
  assert.equal(restored.query, "Ralson RDR");
});

test("trailing space in query survives the URL round-trip", () => {
  const filters = { ...DEFAULT_FILTERS, query: "295/80R22.5 Ralson " };
  const params = paramsFromFilters(filters);
  const restored = filtersFromParams(new URLSearchParams(params.toString()));
  assert.equal(restored.query, "295/80R22.5 Ralson ");
});

test("an all-whitespace query omits the q param entirely", () => {
  const params = paramsFromFilters({ ...DEFAULT_FILTERS, query: "   " });
  assert.equal(params.has("q"), false);
  assert.equal(params.toString(), "");
});

test("filterTyres matches a genuine two-token query", () => {
  const out = filterTyres(data, { ...DEFAULT_FILTERS, query: "Ralson RMR61" });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "b");
});
