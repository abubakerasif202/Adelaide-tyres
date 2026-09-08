import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { catalogue, getTyreBySlug, uniqueBrands, uniqueSizes } from "../../lib/catalogue.ts";
import { clampQuantity } from "../../lib/cart.ts";
import { filterTyres, DEFAULT_FILTERS } from "../../lib/filter.ts";

test("all 25 verified catalogue SKUs load", () => {
  assert.equal(catalogue.length, 25);
});

test("verified production inventory totals 491 tyres", () => {
  assert.equal(catalogue.reduce((total, tyre) => total + tyre.stock, 0), 491);
});

test("every SKU has a unique slug", () => {
  const slugs = catalogue.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every SKU has a unique id", () => {
  const ids = catalogue.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

const spotChecks = [
  { slug: "greforce-gr881w-11r22-5", brand: "Greforce", pattern: "GR881W", size: "11R22.5", stock: 107, price: 220 },
  { slug: "ralson-rmr61-295-80r22-5", brand: "Ralson", pattern: "RMR61", size: "295/80R22.5", stock: 51, price: 450 },
];

for (const expected of spotChecks) {
  test(`${expected.brand} ${expected.pattern} ${expected.size} has the correct stock and price`, () => {
    const tyre = getTyreBySlug(expected.slug);
    assert.ok(tyre, `expected a SKU at slug ${expected.slug}`);
    assert.equal(tyre.brand, expected.brand);
    assert.equal(tyre.pattern, expected.pattern);
    assert.equal(tyre.size, expected.size);
    assert.equal(tyre.stock, expected.stock);
    assert.equal(tyre.price, expected.price);
  });
}

test("brand filtering covers all six real brands", () => {
  assert.deepEqual(uniqueBrands(), ["Greforce", "Haulmax", "Jumbo", "Opartner", "Ralson", "Sailun"]);
});

test("size filtering surfaces every real size", () => {
  const sizes = uniqueSizes();
  for (const size of [
    "11R22.5",
    "295/80R22.5",
    "275/70R22.5",
    "265/70R19.5",
    "235/75R17.5",
    "385/65R22.5",
    "9.5R17.5",
  ]) {
    assert.ok(sizes.includes(size), `expected size ${size} to be present`);
  }
});

test("model search finds real SKUs case-insensitively", () => {
  const cases = [
    ["RMR61", 5],
    ["295/80R22.5", 5],
    ["ralson", 13],
    ["GR881W", 1],
    ["11R22.5", 9],
    ["ATT101", 2],
    ["235/75R17.5", 3],
    ["SFR22", 1],
  ];
  for (const [query, expectedCount] of cases) {
    const results = filterTyres(catalogue, { ...DEFAULT_FILTERS, query });
    assert.equal(results.length, expectedCount, `query "${query}" expected ${expectedCount} results, got ${results.length}`);
  }
});

test("low-stock SKUs clamp quantity to available stock", () => {
  const rmr61_275 = getTyreBySlug("ralson-rmr61-275-70r22-5");
  const att420 = getTyreBySlug("haulmax-att420-295-80r22-5");
  const sfr22 = getTyreBySlug("sailun-sfr22-385-65r22-5");
  assert.equal(rmr61_275.stock, 3);
  assert.equal(att420.stock, 2);
  assert.equal(sfr22.stock, 2);
  assert.equal(clampQuantity(10, rmr61_275.stock), 3);
  assert.equal(clampQuantity(10, att420.stock), 2);
  assert.equal(clampQuantity(10, sfr22.stock), 2);
});

test("every catalogue image mapping has a complete provenance record and local asset", () => {
  const manifest = JSON.parse(readFileSync("docs/product-image-manifest.json", "utf8"));
  assert.equal(manifest.length, catalogue.length);
  assert.equal(new Set(manifest.map((entry) => entry.sku)).size, catalogue.length);
  for (const tyre of catalogue) {
    const entry = manifest.find((candidate) => candidate.sku === tyre.id);
    assert.ok(entry, `missing manifest entry for ${tyre.id}`);
    assert.equal(entry.brand, tyre.brand);
    assert.equal(entry.pattern, tyre.pattern);
    assert.equal(entry.size, tyre.size);
    assert.equal(entry.localPath, tyre.image);
    if (tyre.image) {
      assert.ok(entry.sourceUrl, `missing source URL for ${tyre.id}`);
      assert.ok(entry.rights, `missing rights status for ${tyre.id}`);
      assert.ok(statSync(resolve("public", tyre.image.slice(1))).isFile());
      const shared = catalogue.filter(other => other.image === tyre.image);
      assert.ok(shared.every(other => other.brand === tyre.brand && other.pattern === tyre.pattern), `cross-pattern asset reuse for ${tyre.id}`);
    } else {
      assert.equal(entry.supplierRequest, 'docs/supplier-image-requests.md');
      assert.ok(entry.requestNotes, `missing supplier request for ${tyre.id}`);
    }
  }
});

test("historical inventory transcription remains complete and does not republish withheld rows", () => {
  const [, ...lines] = readFileSync("docs/source-inventory/brand-name-historical.csv", "utf8").trim().split("\n");
  const rows = lines.map((line) => {
    const [page, row, brand, pattern, size, quantity] = line.split(",");
    return { page: Number(page), row: Number(row), brand, pattern, size, quantity: Number(quantity) };
  });
  assert.equal(rows.length, 53);
  assert.equal(rows.reduce((sum, row) => sum + row.quantity, 0), 725);
  assert.deepEqual(rows.find((row) => row.row === 19), {
    page: 1, row: 19, brand: "Greforce", pattern: "G-PILOT", size: "295/80r22.5", quantity: 37,
  });
  for (const row of [4, 17, 23]) {
    const source = rows.find((entry) => entry.row === row);
    assert.ok(source);
    const isPublished = catalogue.some((tyre) =>
      tyre.brand.toLowerCase() === source.brand.toLowerCase() &&
      tyre.pattern.toLowerCase() === source.pattern.toLowerCase() &&
      tyre.size.toLowerCase() === source.size.toLowerCase(),
    );
    assert.equal(isPublished, false, `historical row ${row} must remain withheld`);
  }
});
