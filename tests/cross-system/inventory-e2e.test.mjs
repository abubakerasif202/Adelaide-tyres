/**
 * Cross-application local end-to-end proof:
 *
 *   LOCAL Adelaide website (next start, e.g. :3100)
 *     -> fault-injecting proxy (this process, :3102)
 *       -> LOCAL 247 inventory app (next start, e.g. :3101)
 *         -> LOCAL disposable Supabase
 *   Stripe API stand-in (this process, :3103); payment is signalled through a
 *   signed webhook posted to Adelaide, exactly as production does.
 *
 * Required environment (test-only values, never printed):
 *   AWT_BASE_URL, INVENTORY_UPSTREAM_URL, INVENTORY_PROXY_PORT, STRIPE_STANDIN_PORT,
 *   STRIPE_WEBHOOK_SECRET, ADELAIDE_DATABASE_URL,
 *   SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_ROLE_KEY, SUPABASE_TEST_ALLOW_DESTRUCTIVE=true
 */
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import Stripe from "stripe";
import { createInventoryProxy } from "./support/proxy.mjs";
import { createFakeStripe } from "./support/fake-stripe.mjs";
import { createInventoryHarness, requiredEnv } from "./support/inventory-db.mjs";
import { getTyreBySlug } from "../../lib/catalogue.ts";
import { inventoryMappingIdForProduct } from "../../lib/inventory/mapping.ts";

const REQUIRED = ["AWT_BASE_URL", "INVENTORY_UPSTREAM_URL", "INVENTORY_PROXY_PORT", "STRIPE_STANDIN_PORT", "STRIPE_WEBHOOK_SECRET", "ADELAIDE_DATABASE_URL", "SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY", "SUPABASE_TEST_SERVICE_ROLE_KEY"];
const missing = requiredEnv(REQUIRED);
const suite = missing.length ? describe.skip : describe;
if (missing.length) process.stderr.write(`[cross-system] skipped: missing ${missing.join(", ")}\n`);

const BASE = process.env.AWT_BASE_URL?.replace(/\/$/, "");
const MAIN_SLUG = "ralson-rmr61-295-80r22-5";        // primary proof product
const LOW_STATIC_SLUG = "ralson-rmr61-275-70r22-5";  // static catalogue stock is 3; 247 will hold 10
const EMPTY_247_SLUG = "ralson-rdr75-265-70r19-5";   // static catalogue stock > 0; 247 will hold 0
const UNMAPPED_SLUG = "greforce-g-pilot-x1-295-80r22-5";
const UNMAPPED_SIBLING_SLUG = "greforce-gr881w-11r22-5";
const FRIENDLY_OUTAGE = "We're confirming tyre availability. Please try again shortly.";

let ipCounter = 10;
const details = { name: "E2E Fleet Pty Ltd", phone: "0400000000", email: "e2e@example.invalid", deliveryMethod: "pickup", address: "", suburb: "", postcode: "", abn: "", notes: "" };

function submission(lines, checkoutAttemptId = randomUUID(), extra = {}) {
  return { startedAt: Date.now() - 15_000, checkoutAttemptId, company_website: "", details, lines, ...extra };
}

async function post(path, body, headers = {}) {
  ipCounter += 1;
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, "x-forwarded-for": `198.51.100.${ipCounter % 250}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, json, text, headers: response.headers };
}

const checkout = (lines, attempt, extra) => post("/api/checkout", submission(lines, attempt, extra));
const referenceOrder = (lines, attempt) => post("/api/orders", submission(lines, attempt));
const availability = async (slugs) => {
  const { status, json } = await post("/api/inventory/availability", { slugs });
  assert.equal(status, 200, "availability route must answer");
  return new Map(json.items.map((item) => [item.slug, item]));
};

suite("Adelaide Wholesale Tyres ↔ 247 inventory: cross-system proof", () => {
  const proxy = createInventoryProxy({ upstream: process.env.INVENTORY_UPSTREAM_URL, port: Number(process.env.INVENTORY_PROXY_PORT) });
  const stripeStandIn = createFakeStripe({ port: Number(process.env.STRIPE_STANDIN_PORT) });
  const stripe = new Stripe("sk_test_signing_only", { apiVersion: undefined });
  const sql = postgres(process.env.ADELAIDE_DATABASE_URL, { prepare: false, max: 2 });
  let inventory;
  const products = {};

  const order = async (reference) => (await sql`select reference, status, checkout_session_id, payment_intent_id, inventory_status, inventory_reservation_id, inventory_commit_request_id, inventory_release_request_id, amount_total_cents, lines from orders where reference = ${reference}`)[0] ?? null;

  async function webhook(type, session, eventId = `evt_${randomUUID().replace(/-/g, "")}`) {
    const payload = JSON.stringify({ id: eventId, object: "event", type, data: { object: { id: session.id, object: "checkout.session", payment_status: type.includes("succeeded") || type === "checkout.session.completed" ? "paid" : "unpaid", payment_intent: session.payment_intent, client_reference_id: session.client_reference_id } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const response = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body: payload });
    return { status: response.status, json: await response.json().catch(() => null) };
  }

  const sessionFor = (reference) => stripeStandIn.created.find((c) => c.session.client_reference_id === reference)?.session;

  before(async () => {
    await proxy.start();
    await stripeStandIn.start();
    inventory = await createInventoryHarness();
    for (const [key, slug, onHand] of [["main", MAIN_SLUG, 10], ["lowStatic", LOW_STATIC_SLUG, 10], ["empty", EMPTY_247_SLUG, 0]]) {
      const tyre = getTyreBySlug(slug);
      products[key] = { tyre, productId: await inventory.seedMappedProduct({ websiteProductId: tyre.id, mappingId: inventoryMappingIdForProduct(tyre.id), size: tyre.size, onHand }) };
    }
    // The website must be fully configured (Stripe + webhook + durable store) for card checkout.
    const status = await fetch(`${BASE}/api/checkout/status`).then((r) => r.json());
    assert.equal(status.enabled, true, "Adelaide reports card checkout enabled");
  });

  after(async () => {
    await inventory?.cleanup();
    await sql.end({ timeout: 2 });
    await proxy.stop();
    await stripeStandIn.stop();
  });

  // ---------------------------------------------------------------------------
  // Required end-to-end stock proof
  // ---------------------------------------------------------------------------
  let mainReference;
  let mainSession;
  let commitRequest;

  test("1. website availability comes from 247 (initial on_hand 10 / reserved 0 / available 10)", async () => {
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 10, reserved: 0, available: 10 });
    const seen = await availability([MAIN_SLUG, EMPTY_247_SLUG, UNMAPPED_SLUG]);
    assert.deepEqual({ state: seen.get(MAIN_SLUG).state, available: seen.get(MAIN_SLUG).available }, { state: "in_stock", available: 10 });
    assert.equal(seen.get(EMPTY_247_SLUG).state, "out_of_stock");
    assert.equal(seen.get(UNMAPPED_SLUG).state, "unmapped");
    const forwarded = proxy.requestsTo((e) => e.path === "/api/integrations/adelaide/availability");
    assert.ok(forwarded.length >= 1, "availability was answered by 247, not by the static catalogue");
    assert.ok(forwarded.at(-1).headers["x-awt-signature"], "request was HMAC signed");
    for (const key of ["cost", "wac", "weighted", "supplier"]) assert.doesNotMatch(forwarded.at(-1).responseBody.toLowerCase(), new RegExp(key), "no internal finance data crosses the boundary");
    // The 247 auth middleware must not bounce the server-to-server API to /login:
    // an unsigned request is refused by the HMAC boundary itself, as JSON.
    const unsigned = await fetch(`${process.env.INVENTORY_UPSTREAM_URL}/api/integrations/adelaide/availability`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", redirect: "manual" });
    assert.equal(unsigned.status, 401);
    assert.deepEqual(await unsigned.json(), { error: "INTEGRATION_TIMESTAMP_INVALID" });
  });

  test("2. website checkout reserves authoritative 247 inventory (order 2 -> reserved 2 / available 8)", async () => {
    const attempt = randomUUID();
    const { status, json } = await checkout([{ slug: MAIN_SLUG, quantity: 2 }], attempt);
    assert.equal(status, 200, JSON.stringify(json));
    mainReference = json.reference;
    assert.match(json.url, /^http:\/\/127\.0\.0\.1:\d+\/pay\/cs_test_/, "customer is sent to the (stand-in) Stripe hosted page");
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 10, reserved: 2, available: 8 });
    const seen = await availability([MAIN_SLUG]);
    assert.equal(seen.get(MAIN_SLUG).available, 8);

    mainSession = sessionFor(mainReference);
    assert.ok(mainSession, "a Checkout Session was created for the reference");
    const ttl = mainSession.expires_at - Math.floor(Date.now() / 1000);
    assert.ok(ttl >= 29 * 60 && ttl <= 31 * 60, `Stripe session expires in ~30 minutes (got ${ttl}s)`);
    const [reservation] = await inventory.reservations(mainReference);
    assert.equal(reservation.status, "active");
    assert.equal(reservation.request_id, attempt, "the reservation request id is the browser's checkout attempt id");
    const holdMs = Date.parse(reservation.expires_at) - Date.now();
    assert.ok(holdMs > 40 * 60_000 && holdMs < 50 * 60_000, "247 hold (~45 min) outlives the Stripe session");

    const row = await order(mainReference);
    assert.equal(row.status, "pending");
    assert.equal(row.inventory_status, "reserved");
    assert.equal(row.inventory_reservation_id, reservation.id);
    assert.equal(row.checkout_session_id, mainSession.id);
    assert.equal(row.amount_total_cents, products.main.tyre.price * 2 * 100, "server catalogue price, not the browser's");
  });

  test("3. the success-page redirect never commits inventory by itself", async () => {
    const response = await fetch(`${BASE}/checkout/success?session_id=${mainSession.id}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.doesNotMatch(html, /Order confirmed and paid|payment received/i);
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 10, reserved: 2, available: 8 });
    assert.equal(proxy.requestsTo((e) => e.path === "/api/integrations/adelaide/sales/commit").length, 0);
    assert.equal((await order(mainReference)).status, "pending");
  });

  test("4. a verified paid webhook commits the sale once (on_hand 8 / reserved 0 / available 8, one movement of -2)", async () => {
    stripeStandIn.markPaid(mainSession.id);
    const result = await webhook("checkout.session.completed", mainSession);
    assert.equal(result.status, 200, JSON.stringify(result.json));
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 8, reserved: 0, available: 8 });

    const movements = await inventory.movements(products.main.productId);
    assert.equal(movements.length, 1, "exactly one stock-out movement");
    const [reservation] = await inventory.reservations(mainReference);
    assert.equal(reservation.status, "committed");
    assert.deepEqual(
      { ...movements[0], request_id: undefined },
      { quantity_delta: -2, movement_type: "stock_out", source_type: "adelaide_wholesale_tyres", source_id: mainReference, actor_type: "integration", actor_user_id: null, integration_client_id: process.env.INVENTORY_CLIENT_ID ?? movements[0].integration_client_id, external_reservation_id: reservation.id, request_id: undefined },
    );
    const audit = await inventory.auditEvents(reservation.id);
    assert.deepEqual(audit.map((a) => a.event_type), ["ADELAIDE_RESERVATION_CREATED", "ADELAIDE_SALE_COMMITTED"]);
    assert.ok(audit.every((a) => a.actor_type === "integration" && a.actor_role === "integration"));

    const row = await order(mainReference);
    assert.equal(row.status, "paid");
    assert.equal(row.inventory_status, "committed");
    commitRequest = proxy.requestsTo((e) => e.path === "/api/integrations/adelaide/sales/commit" && e.status === 200).at(-1);
    assert.ok(commitRequest, "captured the successful signed commit request for replay");
    assert.equal(commitRequest.headers["x-awt-request-id"], row.inventory_commit_request_id, "commit uses the durable commit request id");
  });

  test("5. duplicate and differently-identified webhooks cannot deduct twice", async () => {
    const same = await webhook("checkout.session.completed", mainSession, "evt_duplicate_of_first");
    const again = await webhook("checkout.session.completed", mainSession, "evt_duplicate_of_first");
    const other = await webhook("checkout.session.async_payment_succeeded", mainSession);
    assert.deepEqual([same.status, again.status, other.status], [200, 200, 200]);
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 8, reserved: 0, available: 8 });
    assert.equal((await inventory.movements(products.main.productId)).length, 1);
    const notified = stripeStandIn.notifications.filter((n) => n.body?.subject?.includes(mainReference));
    assert.equal(notified.length, 1, "the business is told about the paid order exactly once");
    assert.match(notified[0].body.subject, /^PAID order /);
  });

  test("6. an internal 247 stock-out of 3 is immediately visible to the website (available 5)", async () => {
    await inventory.internalStockOut(products.main.productId, 3);
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    const seen = await availability([MAIN_SLUG]);
    assert.equal(seen.get(MAIN_SLUG).available, 5, "no catalogue edit, redeploy or manual sync");
    assert.equal(seen.get(MAIN_SLUG).state, "in_stock");
  });

  test("7. a website purchase of 6 against available 5 is rejected without touching stock", async () => {
    const { status, json } = await checkout([{ slug: MAIN_SLUG, quantity: 6 }]);
    assert.equal(status, 409, JSON.stringify(json));
    assert.match(json.error, /no longer available in the requested quantity/i);
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    assert.equal(stripeStandIn.created.filter((c) => c.session.client_reference_id !== mainReference).length, 0, "no Stripe session is created for a rejected reservation");
  });

  test("8. replaying the original successful commit leaves stock at 5, not 3", async () => {
    const upstream = process.env.INVENTORY_UPSTREAM_URL.replace(/\/$/, "");
    const headers = { ...commitRequest.headers };
    delete headers.host; delete headers.connection; delete headers["content-length"];
    const replay = await fetch(`${upstream}${commitRequest.path}`, { method: "POST", headers, body: commitRequest.body });
    const replayBody = await replay.json().catch(() => null);
    assert.equal(replay.status, 200, JSON.stringify(replayBody));
    assert.equal(replayBody.status, "committed");
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    assert.equal((await inventory.movements(products.main.productId)).length, 1);
  });

  test("9. two simultaneous website customers cannot oversell the last 5 units", async () => {
    const results = await Promise.all([checkout([{ slug: MAIN_SLUG, quantity: 5 }]), checkout([{ slug: MAIN_SLUG, quantity: 5 }])]);
    const winners = results.filter((r) => r.status === 200);
    const losers = results.filter((r) => r.status === 409);
    assert.equal(winners.length, 1, JSON.stringify(results.map((r) => [r.status, r.json])));
    assert.equal(losers.length, 1);
    const balance = await inventory.balance(products.main.productId);
    assert.deepEqual(balance, { on_hand: 5, reserved: 5, available: 0 });
    assert.ok(balance.reserved <= balance.on_hand && balance.reserved >= 0 && balance.on_hand >= 0);
    const seen = await availability([MAIN_SLUG]);
    assert.equal(seen.get(MAIN_SLUG).state, "out_of_stock");
    // The losing customer never got a Stripe session; the winner abandons: expiry releases the hold.
    const winner = winners[0].json.reference;
    assert.ok(sessionFor(winner));
    const expired = await webhook("checkout.session.expired", sessionFor(winner));
    assert.equal(expired.status, 200);
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    assert.equal((await order(winner)).inventory_status, "released");
    assert.equal((await order(winner)).status, "cancelled");
  });

  // ---------------------------------------------------------------------------
  // Checkout cases
  // ---------------------------------------------------------------------------
  test("CASE 1: static catalogue stock > 0 but 247 says 0 -> checkout rejects", async () => {
    assert.ok(products.empty.tyre.stock > 0, "fixture: static catalogue figure is positive");
    const { status, json } = await checkout([{ slug: EMPTY_247_SLUG, quantity: 1 }]);
    assert.equal(status, 409, JSON.stringify(json));
    assert.deepEqual(await inventory.balance(products.empty.productId), { on_hand: 0, reserved: 0, available: 0 });
  });

  test("CASE 2: static catalogue stock is 3 but 247 has 10 -> ordering 5 succeeds", async () => {
    assert.equal(products.lowStatic.tyre.stock, 3, "fixture: static catalogue figure is 3");
    const { status, json } = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 5 }]);
    assert.equal(status, 200, JSON.stringify(json));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 5, available: 5 });
    await webhook("checkout.session.expired", sessionFor(json.reference));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
  });

  test("CASE 3/4: requested == available succeeds, requested > available fails", async () => {
    const tooMany = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 11 }]);
    assert.equal(tooMany.status, 409);
    const exact = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 10 }]);
    assert.equal(exact.status, 200, JSON.stringify(exact.json));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 10, available: 0 });
    const oneMore = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 1 }]);
    assert.equal(oneMore.status, 409);
    await webhook("checkout.session.async_payment_failed", sessionFor(exact.json.reference));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
    assert.equal((await order(exact.json.reference)).status, "failed");
  });

  test("CASE 5: 247 offline -> checkout fails closed with a customer-friendly message; availability degrades safely", async () => {
    proxy.setMode("offline");
    try {
      const { status, json } = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 1 }]);
      assert.equal(status, 503);
      assert.equal(json.error, FRIENDLY_OUTAGE);
      const degraded = await post("/api/inventory/availability", { slugs: [LOW_STATIC_SLUG] });
      assert.equal(degraded.status, 503);
      assert.deepEqual(degraded.json.items, []);
      const reference = await referenceOrder([{ slug: LOW_STATIC_SLUG, quantity: 1 }]);
      assert.equal(reference.status, 503);
      assert.equal(reference.json.error, FRIENDLY_OUTAGE);
    } finally { proxy.setMode("pass"); }
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
  });

  test("CASE 6: Greforce G-PILOT X1 295/80R22.5 cannot be purchased and creates no reservation", async () => {
    const before = proxy.recorded.length;
    const { status, json } = await checkout([{ slug: UNMAPPED_SLUG, quantity: 1 }]);
    assert.equal(status, 409, JSON.stringify(json));
    assert.match(json.error, /availability confirmation|contact us/i);
    const mixed = await checkout([{ slug: MAIN_SLUG, quantity: 1 }, { slug: UNMAPPED_SLUG, quantity: 1 }]);
    assert.equal(mixed.status, 409);
    const viaReference = await referenceOrder([{ slug: UNMAPPED_SLUG, quantity: 1 }]);
    assert.equal(viaReference.status, 409);
    assert.equal(proxy.recorded.length, before, "no 247 request is made for an unmapped tyre");
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    // The sibling Greforce product is not a substitute: nothing was reserved anywhere.
    const sibling = getTyreBySlug(UNMAPPED_SIBLING_SLUG);
    assert.notEqual(inventoryMappingIdForProduct(sibling.id), null);
    assert.equal(inventoryMappingIdForProduct(getTyreBySlug(UNMAPPED_SLUG).id), null);
  });

  test("CASE 6b: the unmapped product page still renders with SEO data and no purchasable offer", async () => {
    const response = await fetch(`${BASE}/tyres/${UNMAPPED_SLUG}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /G-PILOT X1/);
    assert.match(html, /"@type":"Product"/);
    assert.match(html, /<link rel="canonical"/);
    assert.doesNotMatch(html, /schema\.org\/InStock/);
    const seen = await availability([UNMAPPED_SLUG]);
    assert.equal(seen.get(UNMAPPED_SLUG).state, "unmapped");
  });

  test("CASE 7/8: tampered browser price and inventory ids are ignored; the server catalogue and mapping win", async () => {
    const tyre = getTyreBySlug(LOW_STATIC_SLUG);
    const { status, json } = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 2, price: 0.01, id: "ralson-rmr61-29580r225", inventoryMappingId: inventoryMappingIdForProduct(products.main.tyre.id) }]);
    assert.equal(status, 200, JSON.stringify(json));
    const row = await order(json.reference);
    assert.equal(row.amount_total_cents, tyre.price * 2 * 100);
    assert.equal(row.lines[0].price, tyre.price);
    assert.equal(row.lines[0].id, tyre.id);
    const [reservation] = await inventory.reservations(json.reference);
    const lines = await inventory.reservationLines(reservation.id);
    assert.deepEqual(lines.map((l) => [l.inventory_product_id, l.quantity]), [[products.lowStatic.productId, 2]], "held against the mapped product, not the tampered one");
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    const form = stripeStandIn.created.find((c) => c.session.client_reference_id === json.reference).form;
    assert.equal(Number(form["line_items[0][price_data][unit_amount]"]), tyre.price * 100, "Stripe is charged the catalogue price");
    await webhook("checkout.session.expired", sessionFor(json.reference));
  });

  test("CASE 9: duplicate cart lines aggregate into one reservation line", async () => {
    const { status, json } = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 2 }, { slug: LOW_STATIC_SLUG, quantity: 3 }]);
    assert.equal(status, 200, JSON.stringify(json));
    const [reservation] = await inventory.reservations(json.reference);
    const lines = await inventory.reservationLines(reservation.id);
    assert.deepEqual(lines.map((l) => l.quantity), [5]);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 5, available: 5 });
    await webhook("checkout.session.expired", sessionFor(json.reference));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
  });

  test("CASE 10: malformed quantities are rejected before any inventory mutation", async () => {
    const before = proxy.requestsTo((e) => e.path === "/api/integrations/adelaide/reservations").length;
    for (const quantity of [0, -1, 1.5, "2", null, 1001, 1e9]) {
      const { status } = await checkout([{ slug: LOW_STATIC_SLUG, quantity }]);
      assert.equal(status, 409, `quantity=${String(quantity)}`);
    }
    const badAttempt = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 1 }], "not-a-uuid");
    assert.equal(badAttempt.status, 400);
    const malformed = await post("/api/checkout", "{not json");
    assert.equal(malformed.status, 400);
    assert.equal(proxy.requestsTo((e) => e.path === "/api/integrations/adelaide/reservations").length, before);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
  });

  // ---------------------------------------------------------------------------
  // Distributed failure tests
  // ---------------------------------------------------------------------------
  test("DF1: reservation succeeded in 247 but Adelaide never heard back -> retry with the same attempt recovers the same hold", async () => {
    const attempt = randomUUID();
    proxy.dropNextResponse();
    const first = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 2 }], attempt);
    assert.equal(first.status, 503, JSON.stringify(first.json));
    assert.equal(first.json.error, FRIENDLY_OUTAGE);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 2, available: 8 }, "247 did hold the stock");

    const retry = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 2 }], attempt);
    assert.equal(retry.status, 200, JSON.stringify(retry.json));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 2, available: 8 }, "no double reservation");
    const reservations = await inventory.reservations(retry.json.reference);
    assert.equal(reservations.length, 1);
    assert.equal(reservations[0].request_id, attempt);
    assert.equal((await order(retry.json.reference)).inventory_reservation_id, reservations[0].id);
    await webhook("checkout.session.expired", sessionFor(retry.json.reference));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
  });

  test("DF2: reservation succeeded but Stripe session creation failed -> the hold is released", async () => {
    stripeStandIn.state.failCreate = true;
    let result;
    try { result = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 3 }]); } finally { stripeStandIn.state.failCreate = false; }
    assert.equal(result.status, 502, JSON.stringify(result.json));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 0, available: 10 });
    const releases = proxy.requestsTo((e) => e.method === "DELETE" && e.path.startsWith("/api/integrations/adelaide/reservations/"));
    assert.ok(releases.length >= 1 && releases.at(-1).status === 200, "release reached 247 as a signed DELETE");
    assert.equal(JSON.parse(releases.at(-1).responseBody).status, "released");
    // Order persistence happens after the Stripe call in the same guarded block,
    // so a persistence failure takes this identical release path.
  });

  test("DF3: payment succeeded but 247 is down at commit time -> explicit recoverable state, idempotent retry commits once", async () => {
    const attempt = randomUUID();
    const made = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 2 }], attempt);
    assert.equal(made.status, 200);
    const session = sessionFor(made.json.reference);
    stripeStandIn.markPaid(session.id);

    proxy.setMode("offline");
    let failed;
    try { failed = await webhook("checkout.session.completed", session, "evt_df3_first"); } finally { proxy.setMode("pass"); }
    assert.equal(failed.status, 500, "non-2xx makes Stripe redeliver");
    let row = await order(made.json.reference);
    assert.equal(row.status, "pending", "claim released, order not falsely fulfilled");
    assert.equal(row.inventory_status, "reserved", "inventory never falsely marked committed");
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 10, reserved: 2, available: 8 });

    const retry = await webhook("checkout.session.completed", session, "evt_df3_first");
    assert.equal(retry.status, 200);
    row = await order(made.json.reference);
    assert.equal(row.status, "paid");
    assert.equal(row.inventory_status, "committed");
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 8, reserved: 0, available: 8 });
    assert.equal((await inventory.movements(products.lowStatic.productId)).length, 1);
  });

  test("DF4: commit succeeded in 247 but Adelaide never heard back -> webhook retry replays the same commit, no second deduction", async () => {
    const made = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 1 }]);
    assert.equal(made.status, 200);
    const session = sessionFor(made.json.reference);
    stripeStandIn.markPaid(session.id);

    proxy.dropNextResponse();
    const lost = await webhook("checkout.session.completed", session, "evt_df4");
    assert.equal(lost.status, 500);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 7, reserved: 0, available: 7 }, "247 committed before the response was lost");
    assert.equal((await order(made.json.reference)).inventory_status, "reserved", "Adelaide keeps the explicit recoverable state");

    const retry = await webhook("checkout.session.completed", session, "evt_df4_retry");
    assert.equal(retry.status, 200);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 7, reserved: 0, available: 7 }, "no second deduction");
    const movements = await inventory.movements(products.lowStatic.productId);
    assert.equal(movements.filter((m) => m.source_id === made.json.reference).length, 1);
    const row = await order(made.json.reference);
    assert.equal(row.status, "paid");
    assert.equal(row.inventory_status, "committed");
  });

  test("refund never restocks automatically", async () => {
    const made = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 1 }]);
    assert.equal(made.status, 200);
    const session = sessionFor(made.json.reference);
    stripeStandIn.markPaid(session.id);
    assert.equal((await webhook("checkout.session.completed", session)).status, 200);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 6, reserved: 0, available: 6 });
    const payload = JSON.stringify({ id: `evt_refund_${randomUUID().slice(0, 8)}`, object: "event", type: "charge.refunded", data: { object: { id: "ch_test", object: "charge", payment_intent: session.payment_intent } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const response = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body: payload });
    assert.equal(response.status, 200);
    const row = await order(made.json.reference);
    assert.equal(row.status, "refunded");
    assert.equal(row.inventory_status, "committed");
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 6, reserved: 0, available: 6 }, "physical returns are a separate 247 process");
  });

  test("webhook with a bad signature is rejected and changes nothing", async () => {
    const made = await checkout([{ slug: LOW_STATIC_SLUG, quantity: 1 }]);
    const session = sessionFor(made.json.reference);
    const payload = JSON.stringify({ id: "evt_forged", object: "event", type: "checkout.session.completed", data: { object: { id: session.id, payment_status: "paid", payment_intent: session.payment_intent } } });
    const forged = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" }, body: payload });
    assert.equal(forged.status, 400);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 6, reserved: 1, available: 5 });
    assert.equal((await order(made.json.reference)).status, "pending");
    await webhook("checkout.session.expired", session);
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 6, reserved: 0, available: 6 });
  });

  test("reference (invoice) orders also hold authoritative stock and persist the reservation", async () => {
    const attempt = randomUUID();
    const { status, json } = await referenceOrder([{ slug: LOW_STATIC_SLUG, quantity: 2 }], attempt);
    assert.equal(status, 200, JSON.stringify(json));
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 6, reserved: 2, available: 4 });
    const row = await order(json.reference);
    assert.equal(row.inventory_status, "reserved");
    assert.equal(row.checkout_session_id, null);
    const retry = await referenceOrder([{ slug: LOW_STATIC_SLUG, quantity: 2 }], attempt);
    assert.equal(retry.status, 200);
    assert.equal(retry.json.reference, json.reference, "a retried submission converges on the same order");
    assert.deepEqual(await inventory.balance(products.lowStatic.productId), { on_hand: 6, reserved: 2, available: 4 }, "no double hold");
  });

  test("final ledger invariants hold for every product touched", async () => {
    for (const { productId } of Object.values(products)) {
      const b = await inventory.balance(productId);
      assert.ok(b.on_hand >= 0 && b.reserved >= 0 && b.reserved <= b.on_hand && b.available >= 0, JSON.stringify(b));
    }
    assert.deepEqual(await inventory.balance(products.main.productId), { on_hand: 5, reserved: 0, available: 5 });
    const allMovements = [...(await inventory.movements(products.main.productId)), ...(await inventory.movements(products.lowStatic.productId))];
    const keys = allMovements.map((m) => m.external_reservation_id);
    assert.equal(new Set(keys).size, keys.length, "one sale movement per reservation");
    assert.ok(allMovements.every((m) => m.source_id && m.actor_type === "integration" && m.actor_user_id === null));
  });
});
