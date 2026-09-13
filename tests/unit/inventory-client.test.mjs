import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  INVENTORY_HOLD_MINUTES,
  STRIPE_SESSION_TTL_MINUTES,
  aggregateReservationLines,
  commitInventory,
  getAvailabilityForSlugs,
  releaseInventory,
  reserveInventory,
  sha256Hex,
  signRequest,
  signingString,
} from "../../lib/inventory/client.ts";
import { inventoryMappingIdForProduct, inventoryMappingSummary } from "../../lib/inventory/mapping.ts";
import { InventoryConflictError, InventoryUnavailableError } from "../../lib/inventory/types.ts";
import { getAllTyres, getTyreBySlug } from "../../lib/catalogue.ts";

const SECRET = "unit-test-secret-not-real";
const CLIENT_ID = "awt-unit";
const BASE = "https://inventory.example.test";
const MAPPED_SLUG = "ralson-rmr61-295-80r22-5";
const UNMAPPED_SLUG = "greforce-g-pilot-x1-295-80r22-5";

const ENV = { INVENTORY_API_URL: BASE, INVENTORY_CLIENT_ID: CLIENT_ID, INVENTORY_CLIENT_SECRET: SECRET, INVENTORY_LOCATION_ID: randomUUID() };
const saved = {};

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) { saved[key] = process.env[key]; process.env[key] = value; }
  delete process.env.INVENTORY_ALLOW_INSECURE_LOOPBACK;
});
afterEach(() => {
  for (const key of Object.keys(ENV)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
});

/** Records the request and answers with the configured response. */
function fakeFetch(respond) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    const result = typeof respond === "function" ? await respond(url, init, calls.length) : respond;
    if (result instanceof Error) throw result;
    const { status = 200, body = {} } = result;
    return new Response(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  fetcher.calls = calls;
  return fetcher;
}

function verify(call, method, path) {
  const url = new URL(call.url);
  assert.equal(url.origin, BASE);
  assert.equal(url.pathname, path);
  assert.equal(call.init.method, method);
  const h = call.init.headers;
  assert.equal(h["x-awt-client-id"], CLIENT_ID);
  assert.match(h["x-awt-request-id"], /^[0-9a-f-]{36}$/);
  assert.match(h["x-awt-timestamp"], /^\d{13}$/);
  assert.ok(Math.abs(Date.now() - Number(h["x-awt-timestamp"])) < 5_000);
  const expected = createHmac("sha256", SECRET)
    .update(`${method}\n${path}\n${h["x-awt-timestamp"]}\n${h["x-awt-request-id"]}\n${createHash("sha256").update(call.init.body).digest("hex")}`)
    .digest("hex");
  assert.equal(h["x-awt-signature"], expected, "signature must match 247's canonical signing string");
  assert.equal(call.init.cache, "no-store");
  return { headers: h, body: JSON.parse(call.init.body) };
}

test("mapping: 24 mapped, exactly one unmapped, none ambiguous, and it is the G-PILOT X1", () => {
  const slugs = getAllTyres().map((t) => t.slug);
  const mapped = slugs.filter((slug) => inventoryMappingIdForProduct(getTyreBySlug(slug).id));
  const unmapped = slugs.filter((slug) => !inventoryMappingIdForProduct(getTyreBySlug(slug).id));
  assert.equal(mapped.length, 24);
  assert.deepEqual(unmapped, [UNMAPPED_SLUG]);
  const ids = mapped.map((slug) => inventoryMappingIdForProduct(getTyreBySlug(slug).id));
  assert.equal(new Set(ids).size, 24, "mapping ids must be unique (no two tyres share a 247 product)");
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.deepEqual(inventoryMappingSummary, { mapped: 24, unmatched: 1, ambiguous: 0 });
  const gpilot = getTyreBySlug(UNMAPPED_SLUG);
  assert.equal(gpilot.brand.toLowerCase(), "greforce");
  assert.match(gpilot.pattern, /G-PILOT X1/i);
  assert.equal(gpilot.size, "295/80R22.5");
});

test("mapping ids are derived deterministically from the website product id (md5 namespace)", () => {
  // 247 seeds its adelaide_product_mappings with md5('adelaide-wholesale-tyres:' || website_product_id)::uuid.
  const tyre = getTyreBySlug(MAPPED_SLUG);
  const hex = createHash("md5").update(`adelaide-wholesale-tyres:${tyre.id}`).digest("hex");
  const expected = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  assert.equal(inventoryMappingIdForProduct(tyre.id), expected);
});

test("canonical signing string, SHA-256 body hash and deterministic HMAC", () => {
  assert.equal(sha256Hex("{}"), "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
  assert.equal(signingString("post", "/p", "1", "rid", "h"), "POST\n/p\n1\nrid\nh");
  const a = signRequest("POST", "/p", "1700000000000", "rid", "{}", SECRET);
  const b = signRequest("POST", "/p", "1700000000000", "rid", "{}", SECRET);
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(signRequest("DELETE", "/p", "1700000000000", "rid", "{}", SECRET), a, "method is bound");
  assert.notEqual(signRequest("POST", "/q", "1700000000000", "rid", "{}", SECRET), a, "path is bound");
  assert.notEqual(signRequest("POST", "/p", "1700000000001", "rid", "{}", SECRET), a, "timestamp is bound");
  assert.notEqual(signRequest("POST", "/p", "1700000000000", "rid2", "{}", SECRET), a, "request id is bound");
  assert.notEqual(signRequest("POST", "/p", "1700000000000", "rid", "{ }", SECRET), a, "body is bound");
  assert.notEqual(signRequest("POST", "/p", "1700000000000", "rid", "{}", "other"), a, "secret is bound");
});

test("availability: signs the request, maps 247 rows to states, unmapped and unreported tyres are not purchasable", async () => {
  const mapped = inventoryMappingIdForProduct(getTyreBySlug(MAPPED_SLUG).id);
  const other = getAllTyres().find((t) => t.slug !== MAPPED_SLUG && inventoryMappingIdForProduct(t.id));
  const fetcher = fakeFetch({ body: { items: [{ inventoryMappingId: mapped, onHand: 9, reserved: 1, available: 8, updatedAt: "2026-09-13T00:00:00Z" }] } });
  const result = await getAvailabilityForSlugs([MAPPED_SLUG, MAPPED_SLUG, UNMAPPED_SLUG, other.slug, "no-such-tyre"], fetcher);
  const { body } = verify(fetcher.calls[0], "POST", "/api/integrations/adelaide/availability");
  assert.equal(body.items.length, 2, "duplicate slugs collapse to one lookup per mapping");
  assert.ok(body.items.every((i) => i.inventoryMappingId !== null && /^[0-9a-f-]{36}$/.test(i.inventoryMappingId)));
  const bySlug = new Map(result.map((r) => [r.slug, r]));
  assert.deepEqual(bySlug.get(MAPPED_SLUG), { slug: MAPPED_SLUG, state: "in_stock", available: 8, updatedAt: "2026-09-13T00:00:00Z" });
  assert.equal(bySlug.get(UNMAPPED_SLUG).state, "unmapped");
  assert.equal(bySlug.get("no-such-tyre").state, "unmapped");
  assert.equal(bySlug.get(other.slug).state, "unavailable", "a mapped tyre 247 did not report must not be sold");
  assert.equal(bySlug.get(other.slug).available, null);
});

test("availability: state thresholds", async () => {
  const mapped = inventoryMappingIdForProduct(getTyreBySlug(MAPPED_SLUG).id);
  for (const [available, state] of [[0, "out_of_stock"], [-2, "out_of_stock"], [1, "low_stock"], [4, "low_stock"], [5, "in_stock"]]) {
    const fetcher = fakeFetch({ body: { items: [{ inventoryMappingId: mapped, available, updatedAt: "" }] } });
    const [row] = await getAvailabilityForSlugs([MAPPED_SLUG], fetcher);
    assert.equal(row.state, state, `available=${available}`);
  }
});

test("availability: only unmapped slugs never calls 247", async () => {
  const fetcher = fakeFetch({ body: {} });
  const result = await getAvailabilityForSlugs([UNMAPPED_SLUG], fetcher);
  assert.equal(fetcher.calls.length, 0);
  assert.deepEqual(result, [{ slug: UNMAPPED_SLUG, state: "unmapped", available: null, updatedAt: null }]);
});

test("fail closed: 5xx, 4xx, network error, timeout, invalid JSON and invalid schema all become InventoryUnavailableError", async () => {
  const mapped = inventoryMappingIdForProduct(getTyreBySlug(MAPPED_SLUG).id);
  const cases = [
    ["500", { status: 500, body: { error: "INTEGRATION_UNAVAILABLE" } }],
    ["503 html", { status: 503, body: "<html>bad gateway</html>" }],
    ["401", { status: 401, body: { error: "INTEGRATION_SIGNATURE_INVALID" } }],
    ["400", { status: 400, body: { error: "INVALID_REQUEST" } }],
    ["network error", new TypeError("fetch failed")],
    ["timeout", Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })],
    ["invalid json", { status: 200, body: "{not json" }],
    ["items not array", { status: 200, body: { items: "8" } }],
    ["available not integer", { status: 200, body: { items: [{ inventoryMappingId: mapped, available: "8" }] } }],
    ["available fractional", { status: 200, body: { items: [{ inventoryMappingId: mapped, available: 1.5 }] } }],
    ["mapping not uuid", { status: 200, body: { items: [{ inventoryMappingId: "x", available: 1 }] } }],
    ["empty body", { status: 200, body: "" }],
  ];
  for (const [label, response] of cases) {
    await assert.rejects(getAvailabilityForSlugs([MAPPED_SLUG], fakeFetch(response)), InventoryUnavailableError, label);
  }
});

test("fail closed: missing configuration, non-https, or a loopback URL without the explicit opt-in", async () => {
  const fetcher = fakeFetch({ body: { items: [] } });
  for (const key of Object.keys(ENV)) {
    const value = process.env[key];
    delete process.env[key];
    await assert.rejects(getAvailabilityForSlugs([MAPPED_SLUG], fetcher), InventoryUnavailableError, `missing ${key}`);
    process.env[key] = value;
  }
  process.env.INVENTORY_API_URL = "http://inventory.example.test";
  await assert.rejects(getAvailabilityForSlugs([MAPPED_SLUG], fetcher), InventoryUnavailableError, "plain http to a remote host");
  process.env.INVENTORY_API_URL = "http://127.0.0.1:3101";
  await assert.rejects(getAvailabilityForSlugs([MAPPED_SLUG], fetcher), InventoryUnavailableError, "loopback http without opt-in");
  process.env.INVENTORY_ALLOW_INSECURE_LOOPBACK = "true";
  await getAvailabilityForSlugs([MAPPED_SLUG], fetcher);
  assert.equal(new URL(fetcher.calls.at(-1).url).origin, "http://127.0.0.1:3101");
  process.env.INVENTORY_API_URL = "not a url";
  await assert.rejects(getAvailabilityForSlugs([MAPPED_SLUG], fetcher), InventoryUnavailableError, "unparseable url");
  assert.equal(fetcher.calls.length, 1, "no request may leave the server when configuration is invalid");
});

test("secret hygiene: the client secret is server-only and never uses NEXT_PUBLIC_", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../../lib/inventory/client.ts", import.meta.url), "utf8");
  assert.match(source, /^import 'server-only';/m);
  assert.doesNotMatch(source, /NEXT_PUBLIC_/);
  const envExample = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^INVENTORY_CLIENT_SECRET=/m);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_INVENTORY/);
  for (const file of ["availability-context.tsx", "mapping.ts", "types.ts"]) {
    const text = readFileSync(new URL(`../../lib/inventory/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /INVENTORY_CLIENT_SECRET|createHmac/, `${file} must not touch the secret`);
  }
});

test("reserve: aggregates duplicate lines, resolves mappings server-side, signs POST and uses the caller's request id", async () => {
  const fetcher = fakeFetch({ status: 201, body: { reservation_id: "11111111-2222-4333-8444-555555555555", status: "active", expires_at: "2026-09-13T01:00:00Z", order_reference: "AWT-2026-ABCD1234" } });
  const requestId = randomUUID();
  const before = Date.now();
  const reservation = await reserveInventory("AWT-2026-ABCD1234", [{ id: MAPPED_SLUG, quantity: 2 }, { id: MAPPED_SLUG, quantity: 3 }], requestId, fetcher);
  const { headers, body } = verify(fetcher.calls[0], "POST", "/api/integrations/adelaide/reservations");
  assert.equal(headers["x-awt-request-id"], requestId);
  assert.equal(body.orderReference, "AWT-2026-ABCD1234");
  assert.deepEqual(body.items, [{ inventoryMappingId: inventoryMappingIdForProduct(getTyreBySlug(MAPPED_SLUG).id), quantity: 5 }]);
  const expiresAt = Date.parse(body.expiresAt);
  assert.ok(expiresAt - before >= INVENTORY_HOLD_MINUTES * 60_000 - 1_000 && expiresAt - before <= INVENTORY_HOLD_MINUTES * 60_000 + 5_000);
  assert.ok(INVENTORY_HOLD_MINUTES > STRIPE_SESSION_TTL_MINUTES, "hold must outlive the Stripe session");
  assert.ok(STRIPE_SESSION_TTL_MINUTES >= 30, "Stripe requires at least a 30 minute session");
  assert.deepEqual(reservation, { reservationId: "11111111-2222-4333-8444-555555555555", status: "active", expiresAt: "2026-09-13T01:00:00Z", orderReference: "AWT-2026-ABCD1234" });
});

test("reserve: unmapped product is refused before any request", async () => {
  const fetcher = fakeFetch({ body: {} });
  await assert.rejects(reserveInventory("AWT-1", [{ id: UNMAPPED_SLUG, quantity: 1 }], randomUUID(), fetcher), InventoryConflictError);
  await assert.rejects(reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity: 1 }, { id: UNMAPPED_SLUG, quantity: 1 }], randomUUID(), fetcher), InventoryConflictError);
  await assert.rejects(reserveInventory("AWT-1", [{ id: "no-such-tyre", quantity: 1 }], randomUUID(), fetcher), InventoryConflictError);
  assert.equal(fetcher.calls.length, 0);
});

test("reserve: malformed quantities are refused before any request", async () => {
  const fetcher = fakeFetch({ body: {} });
  for (const quantity of [0, -1, 1.5, NaN, Infinity, "2", null, 1001, 2 ** 53]) {
    await assert.rejects(reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity }], randomUUID(), fetcher), InventoryConflictError, `quantity=${String(quantity)}`);
  }
  await assert.rejects(reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity: 600 }, { id: MAPPED_SLUG, quantity: 600 }], randomUUID(), fetcher), InventoryConflictError, "aggregate over the cap");
  await assert.rejects(reserveInventory("AWT-1", [], randomUUID(), fetcher), InventoryConflictError, "empty cart");
  assert.equal(fetcher.calls.length, 0);
  assert.deepEqual(aggregateReservationLines([{ id: "a", quantity: 1 }, { id: "b", quantity: 2 }, { id: "a", quantity: 3 }]), [{ id: "a", quantity: 4 }, { id: "b", quantity: 2 }]);
});

test("reserve: a bad request id never reaches 247", async () => {
  const fetcher = fakeFetch({ body: {} });
  await assert.rejects(reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity: 1 }], "not-a-uuid", fetcher), InventoryUnavailableError);
  assert.equal(fetcher.calls.length, 0);
});

test("reserve: 409 / stock codes become a customer-facing conflict, everything else fails closed", async () => {
  for (const [status, code] of [[409, "INSUFFICIENT_STOCK"], [409, "RESERVATION_EXPIRED"], [400, "UNKNOWN_PRODUCT_MAPPING"], [409, "PRODUCT_INACTIVE"]]) {
    await assert.rejects(reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity: 1 }], randomUUID(), fakeFetch({ status, body: { error: code } })), InventoryConflictError, code);
  }
  for (const response of [{ status: 500, body: { error: "INTEGRATION_UNAVAILABLE" } }, { status: 401, body: { error: "INTEGRATION_SIGNATURE_INVALID" } }, new TypeError("fetch failed"), { status: 201, body: { reservation_id: "nope", status: "active" } }, { status: 201, body: { reservation_id: randomUUID(), status: "weird" } }]) {
    await assert.rejects(reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity: 1 }], randomUUID(), fakeFetch(response)), InventoryUnavailableError);
  }
});

test("release: signs a DELETE bound to the reservation path", async () => {
  const reservationId = randomUUID();
  const fetcher = fakeFetch({ body: { reservation_id: reservationId, status: "released", order_reference: "AWT-1" } });
  const requestId = randomUUID();
  const result = await releaseInventory(reservationId, "payment_not_completed", requestId, fetcher);
  const { headers, body } = verify(fetcher.calls[0], "DELETE", `/api/integrations/adelaide/reservations/${reservationId}`);
  assert.equal(headers["x-awt-request-id"], requestId);
  assert.deepEqual(body, { reason: "payment_not_completed" });
  assert.equal(result.status, "released");
  await assert.rejects(releaseInventory("../sales/commit", "x", randomUUID(), fetcher), InventoryUnavailableError, "path injection is refused");
  assert.equal(fetcher.calls.length, 1);
});

test("commit: signs POST with the order reference and the durable commit request id", async () => {
  const reservationId = randomUUID();
  const fetcher = fakeFetch({ body: { reservation_id: reservationId, status: "committed", order_reference: "AWT-1", committed_at: "2026-09-13T00:00:00Z" } });
  const requestId = randomUUID();
  const result = await commitInventory(reservationId, "AWT-1", requestId, fetcher);
  const { headers, body } = verify(fetcher.calls[0], "POST", "/api/integrations/adelaide/sales/commit");
  assert.equal(headers["x-awt-request-id"], requestId);
  assert.deepEqual(body, { reservationId, orderReference: "AWT-1" });
  assert.equal(result.status, "committed");
  await assert.rejects(commitInventory(reservationId, "AWT-1", randomUUID(), fakeFetch({ status: 409, body: { error: "RESERVATION_NOT_ACTIVE" } })), InventoryConflictError);
  await assert.rejects(commitInventory(reservationId, "AWT-1", randomUUID(), fakeFetch(new TypeError("fetch failed"))), InventoryUnavailableError);
});

test("response parsing accepts both snake_case (247) and camelCase reservation payloads", async () => {
  const reservationId = randomUUID();
  const snake = await commitInventory(reservationId, "AWT-1", randomUUID(), fakeFetch({ body: { reservation_id: reservationId, status: "committed", order_reference: "AWT-1" } }));
  const camel = await commitInventory(reservationId, "AWT-1", randomUUID(), fakeFetch({ body: { reservationId, status: "committed", orderReference: "AWT-1" } }));
  assert.deepEqual(snake, camel);
});

test("reserve: accepts the catalogue id emitted by validateOrderLines (not only the slug)", async () => {
  const { validateOrderLines } = await import("../../lib/order-lines.ts");
  const { lines } = validateOrderLines([{ slug: MAPPED_SLUG, quantity: 2 }]);
  assert.notEqual(lines[0].id, MAPPED_SLUG, "the catalogue id differs from the slug for this tyre");
  const fetcher = fakeFetch({ status: 201, body: { reservation_id: randomUUID(), status: "active" } });
  await reserveInventory("AWT-1", lines, randomUUID(), fetcher);
  const { body } = verify(fetcher.calls[0], "POST", "/api/integrations/adelaide/reservations");
  assert.deepEqual(body.items, [{ inventoryMappingId: inventoryMappingIdForProduct(getTyreBySlug(MAPPED_SLUG).id), quantity: 2 }]);
});

test("commit: a 200 whose status is not committed is never treated as a sale", async () => {
  const reservationId = randomUUID();
  await assert.rejects(commitInventory(reservationId, "AWT-1", randomUUID(), fakeFetch({ body: { reservation_id: reservationId, status: "expired", order_reference: "AWT-1" } })), InventoryConflictError);
});

// ---------------------------------------------------------------------------
// Cold-start resilience: read-only availability retries once; mutations never do.
// ---------------------------------------------------------------------------
const noSleep = async () => {};
const okAvailability = () => ({ body: { items: [{ inventoryMappingId: inventoryMappingIdForProduct(getTyreBySlug(MAPPED_SLUG).id), available: 9, updatedAt: "" }] } });
const timeoutError = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
const quiet = async (fn) => { const w = console.warn, e = console.error; console.warn = () => {}; console.error = () => {}; try { return await fn(); } finally { console.warn = w; console.error = e; } };

test("availability: first attempt times out, the single retry succeeds", async () => {
  const fetcher = fakeFetch((_u, _i, n) => (n === 1 ? timeoutError() : okAvailability()));
  const [row] = await quiet(() => getAvailabilityForSlugs([MAPPED_SLUG], fetcher, { sleep: noSleep }));
  assert.equal(row.available, 9);
  assert.equal(fetcher.calls.length, 2);
  assert.notEqual(fetcher.calls[0].init.headers["x-awt-request-id"], undefined);
});

test("availability: first attempt 503, the single retry succeeds (also 502/504)", async () => {
  for (const status of [502, 503, 504]) {
    const fetcher = fakeFetch((_u, _i, n) => (n === 1 ? { status, body: { error: "INTEGRATION_UNAVAILABLE" } } : okAvailability()));
    const [row] = await quiet(() => getAvailabilityForSlugs([MAPPED_SLUG], fetcher, { sleep: noSleep }));
    assert.equal(row.available, 9, `status ${status}`);
    assert.equal(fetcher.calls.length, 2);
  }
});

test("availability: both attempts fail -> fail closed, exactly two attempts, no static catalogue fallback", async () => {
  for (const respond of [() => timeoutError(), () => ({ status: 503, body: { error: "INTEGRATION_UNAVAILABLE" } }), () => new TypeError("fetch failed")]) {
    const fetcher = fakeFetch(respond);
    await assert.rejects(quiet(() => getAvailabilityForSlugs([MAPPED_SLUG], fetcher, { sleep: noSleep })), InventoryUnavailableError);
    assert.equal(fetcher.calls.length, 2);
  }
  assert.ok(getTyreBySlug(MAPPED_SLUG).stock > 0, "fixture: the static figure is positive and must never be used");
});

test("availability: non-transient failures (500, 401, 400, invalid schema) are not retried", async () => {
  for (const response of [{ status: 500, body: { error: "INTEGRATION_UNAVAILABLE" } }, { status: 401, body: { error: "INTEGRATION_SIGNATURE_INVALID" } }, { status: 400, body: { error: "INVALID_REQUEST" } }, { status: 200, body: { items: "nope" } }]) {
    const fetcher = fakeFetch(response);
    await assert.rejects(quiet(() => getAvailabilityForSlugs([MAPPED_SLUG], fetcher, { sleep: noSleep })), InventoryUnavailableError);
    assert.equal(fetcher.calls.length, 1, JSON.stringify(response));
  }
});

test("reservation timeout is never retried (a retry must reuse the durable request id, owned by the caller)", async () => {
  for (const respond of [() => timeoutError(), () => ({ status: 503, body: { error: "INTEGRATION_UNAVAILABLE" } })]) {
    const fetcher = fakeFetch(respond);
    await assert.rejects(quiet(() => reserveInventory("AWT-1", [{ id: MAPPED_SLUG, quantity: 1 }], randomUUID(), fetcher)), InventoryUnavailableError);
    assert.equal(fetcher.calls.length, 1);
  }
});

test("commit and release are never retried by the client; the same request id is reused by the caller's retry", async () => {
  const reservationId = randomUUID();
  const requestId = randomUUID();
  const seen = [];
  const fetcher = fakeFetch((_u, init, n) => { seen.push(init.headers["x-awt-request-id"]); return n === 1 ? timeoutError() : { body: { reservation_id: reservationId, status: "committed", order_reference: "AWT-1" } }; });
  await assert.rejects(quiet(() => commitInventory(reservationId, "AWT-1", requestId, fetcher)), InventoryUnavailableError);
  assert.equal(fetcher.calls.length, 1, "no automatic retry inside the client");
  const result = await commitInventory(reservationId, "AWT-1", requestId, fetcher);
  assert.equal(result.status, "committed");
  assert.deepEqual(seen, [requestId, requestId], "the caller's retry carried the identical durable request id");
  const releaseFetcher = fakeFetch({ status: 503, body: { error: "INTEGRATION_UNAVAILABLE" } });
  await assert.rejects(quiet(() => releaseInventory(reservationId, "x", randomUUID(), releaseFetcher)), InventoryUnavailableError);
  assert.equal(releaseFetcher.calls.length, 1);
});

test("structured failure logs carry only operational fields", async () => {
  const lines = [];
  const w = console.warn, e = console.error; console.warn = (l) => lines.push(l); console.error = (l) => lines.push(l);
  try { await assert.rejects(reserveInventory("AWT-LOG-1", [{ id: MAPPED_SLUG, quantity: 1 }], randomUUID(), fakeFetch(() => timeoutError())), InventoryUnavailableError); }
  finally { console.warn = w; console.error = e; }
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.event, "inventory.request.failed");
  assert.equal(entry.errorCode, "TIMEOUT");
  assert.equal(entry.orderReference, "AWT-LOG-1");
  assert.equal(entry.route, "/api/integrations/adelaide/reservations");
  assert.doesNotMatch(lines[0], new RegExp(SECRET));
  assert.doesNotMatch(lines[0], /x-awt-signature|quantity|email/);
});
