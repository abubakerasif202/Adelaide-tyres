import { test } from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { accessories, getAccessoryBySlug } from "../../lib/accessories.ts";
import { catalogue } from "../../lib/catalogue.ts";
import { DEFAULT_FILTERS, filterAccessories, filterTyres } from "../../lib/filter.ts";
import { accessoryJsonLd } from "../../lib/seo.ts";

const valve = getAccessoryBySlug("tr545d-truck-tyre-valve");

test("TR545D valve is listed at exactly $10.00 with its supplied copy", () => {
  assert.ok(valve);
  assert.equal(valve.sku, "TR545D");
  assert.equal(valve.name, "TR545D Truck Tyre Valve");
  assert.equal(valve.subtitle, "60° Alloy Wheel Valve");
  assert.equal(valve.price, 10);
  assert.equal(valve.price.toFixed(2), "10.00");
  assert.equal(valve.purchasable, true);
  assert.equal(valve.imageAlt, "TR545D 60 degree truck tyre valve for alloy wheels");
  assert.equal(
    valve.metaDescription,
    "Shop the TR545D 60° truck tyre valve for alloy and aluminium truck wheels at Adelaide Wholesale Tyres. Available for $10.00.",
  );
  assert.deepEqual(Object.fromEntries(valve.specs), {
    ...Object.fromEntries(valve.specs),
    Model: "TR545D",
    Type: "Truck Tyre Valve",
    Angle: "60°",
    "Wheel Type": "Alloy / Aluminium Truck Wheels",
    Material: "Metal",
    SKU: "TR545D",
  });
});

test("accessory image asset exists locally", () => {
  assert.ok(statSync(resolve("public", valve.image.slice(1))).isFile());
});

test("accessories never collide with tyre ids or slugs and stay out of the tyre catalogue", () => {
  for (const accessory of accessories) {
    assert.ok(!catalogue.some((t) => t.id === accessory.id || t.slug === accessory.slug));
  }
  assert.equal(filterTyres(catalogue, { ...DEFAULT_FILTERS, query: "TR545D" }).length, 0);
});

test("catalogue search locates the valve by SKU and plain-language terms", () => {
  for (const query of ["TR545D", "tr545d", "truck valve", "tyre valve", "alloy wheel valve", "truck tyre accessories"]) {
    const found = filterAccessories(accessories, { ...DEFAULT_FILTERS, query });
    assert.equal(found.length, 1, `query "${query}" should find the valve`);
    assert.equal(found[0].sku, "TR545D");
  }
  assert.equal(filterAccessories(accessories, { ...DEFAULT_FILTERS, query: "295/80R22.5" }).length, 0);
});

test("tyre-only facets hide accessories; price sorts keep them", () => {
  assert.equal(filterAccessories(accessories, DEFAULT_FILTERS).length, 1);
  assert.equal(filterAccessories(accessories, { ...DEFAULT_FILTERS, size: "11R22.5" }).length, 0);
  assert.equal(filterAccessories(accessories, { ...DEFAULT_FILTERS, brand: "Ralson" }).length, 0);
  assert.equal(filterAccessories(accessories, { ...DEFAULT_FILTERS, application: "truck" }).length, 0);
  assert.equal(filterAccessories(accessories, { ...DEFAULT_FILTERS, inStockOnly: true }).length, 0);
  assert.equal(filterAccessories(accessories, { ...DEFAULT_FILTERS, sort: "price-asc" }).length, 1);
});

test("Product schema for the valve carries sku, price and new condition", () => {
  const ld = accessoryJsonLd(valve);
  assert.equal(ld["@type"], "Product");
  assert.equal(ld.sku, "TR545D");
  assert.equal(ld.offers.price, "10.00");
  assert.equal(ld.offers.priceCurrency, "AUD");
  assert.equal(ld.itemCondition, "https://schema.org/NewCondition");
  assert.match(ld.offers.url, /\/accessories\/tr545d-truck-tyre-valve$/);
});
