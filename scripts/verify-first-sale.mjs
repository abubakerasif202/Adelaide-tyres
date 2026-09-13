#!/usr/bin/env node
// READ-ONLY verification of a genuine customer sale across both systems.
//
//   node --conditions=react-server scripts/verify-first-sale.mjs [AWT-2026-XXXXXXXX]
//
// Env (names only; never printed):
//   DATABASE_URL                          Adelaide order store
//   INVENTORY_SUPABASE_URL                247 project URL          (REST, read-only)
//   INVENTORY_SUPABASE_SERVICE_ROLE_KEY   247 service-role key     (REST, read-only)
//   -- or -- INVENTORY_DATABASE_URL       247 Postgres (admin) instead of REST
//   AWT_BASE_URL                          optional, defaults to the production site
//
// Without an argument the most recent paid order is verified. Exit code 1 on any FAIL.
import postgres from "postgres";
import { getTyreById } from "../lib/catalogue.ts";
import { inventoryMappingIdForProduct } from "../lib/inventory/mapping.ts";

const BASE = (process.env.AWT_BASE_URL ?? "https://adelaidewholesaletyres.com.au").replace(/\/$/, "");
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); };

function inventoryReader() {
  if (process.env.INVENTORY_DATABASE_URL) {
    const sql = postgres(process.env.INVENTORY_DATABASE_URL, { prepare: false, max: 1 });
    return {
      reservation: async (id) => (await sql`select id, status, external_order_reference, request_id, commit_request_id, committed_at, location_id from public.adelaide_inventory_reservations where id = ${id}`)[0] ?? null,
      lines: (id) => sql`select mapping_id, inventory_product_id, quantity from public.adelaide_inventory_reservation_lines where reservation_id = ${id}`,
      movements: (id) => sql`select id, product_id, quantity_delta, movement_type, source_type, source_id, actor_type, actor_user_id, integration_client_id, external_reservation_id, request_id from public.inventory_movements where external_reservation_id = ${id}`,
      balance: async (productId, locationId) => (await sql`select on_hand, reserved from public.inventory_balances where product_id = ${productId} and location_id = ${locationId}`)[0] ?? null,
      invariants: async () => (await sql`select (select count(*) from public.inventory_balances where on_hand < 0 or reserved < 0 or reserved > on_hand)::int as bad_balances, (select count(*) from (select external_reservation_id, product_id from public.inventory_movements where external_reservation_id is not null group by 1,2 having count(*) > 1) d)::int as duplicate_commits, (select count(*) from public.adelaide_inventory_reservations r where r.status = 'committed' and not exists (select 1 from public.inventory_movements m where m.external_reservation_id = r.id))::int as committed_without_movement, (select count(*) from public.adelaide_inventory_reservations where status = 'active' and expires_at <= now())::int as expired_active, (select count(*) from public.inventory_movements where source_type = 'adelaide_wholesale_tyres' and (external_reservation_id is null or coalesce(source_id, '') = ''))::int as orphan_movements`)[0],
      end: () => sql.end({ timeout: 2 }),
    };
  }
  const url = process.env.INVENTORY_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.INVENTORY_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set INVENTORY_DATABASE_URL, or INVENTORY_SUPABASE_URL + INVENTORY_SUPABASE_SERVICE_ROLE_KEY");
  const get = async (path) => { const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` } }); if (!r.ok) throw new Error(`247 REST ${path.split("?")[0]} -> ${r.status}`); return r.json(); };
  return {
    reservation: async (id) => (await get(`adelaide_inventory_reservations?select=id,status,external_order_reference,request_id,commit_request_id,committed_at,location_id&id=eq.${id}`))[0] ?? null,
    lines: (id) => get(`adelaide_inventory_reservation_lines?select=mapping_id,inventory_product_id,quantity&reservation_id=eq.${id}`),
    movements: (id) => get(`inventory_movements?select=id,product_id,quantity_delta,movement_type,source_type,source_id,actor_type,actor_user_id,integration_client_id,external_reservation_id,request_id&external_reservation_id=eq.${id}`),
    balance: async (productId, locationId) => (await get(`inventory_balances?select=on_hand,reserved&product_id=eq.${productId}&location_id=eq.${locationId}`))[0] ?? null,
    invariants: async () => ({
      bad_balances: (await get(`inventory_balances?select=product_id&or=(on_hand.lt.0,reserved.lt.0)`)).length,
      expired_active: (await get(`adelaide_inventory_reservations?select=id&status=eq.active&expires_at=lte.${encodeURIComponent(new Date().toISOString())}`)).length,
      orphan_movements: (await get(`inventory_movements?select=id&source_type=eq.adelaide_wholesale_tyres&external_reservation_id=is.null`)).length,
      duplicate_commits: "n/a via REST (checked per reservation above)",
      committed_without_movement: "n/a via REST (checked per reservation above)",
    }),
    end: async () => {},
  };
}

const awt = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: "require" });
const inv = inventoryReader();
try {
  const reference = process.argv[2];
  const [order] = reference
    ? await awt`select * from orders where reference = ${reference}`
    : await awt`select * from orders where status = 'paid' order by updated_at desc limit 1`;
  if (!order) { console.error("No matching paid order found."); process.exit(1); }
  console.log(`Order ${order.reference}  status=${order.status}  inventory_status=${order.inventory_status}  session=${order.checkout_session_id ?? "(reference order)"}`);

  check("order status is paid", order.status === "paid", order.status);
  check("order inventory_status is committed", order.inventory_status === "committed", order.inventory_status);
  check("order has reservation id", Boolean(order.inventory_reservation_id));
  check("business notification delivered (notified_at set)", Boolean(order.notified_at), order.notified_at ? String(order.notified_at) : "not notified");
  const events = await awt`select event_id, event_type from stripe_events where checkout_session_id = ${order.checkout_session_id}`;
  check("at least one Stripe payment event recorded for the session", events.some((e) => /completed|async_payment_succeeded/.test(e.event_type)), events.map((e) => e.event_type).join(","));

  const purchased = order.lines.reduce((sum, l) => sum + l.quantity, 0);
  const reservation = order.inventory_reservation_id ? await inv.reservation(order.inventory_reservation_id) : null;
  check("247 reservation exists", Boolean(reservation));
  if (reservation) {
    check("247 reservation status committed", reservation.status === "committed", reservation.status);
    check("247 reservation reference matches order", reservation.external_order_reference === order.reference);
    check("247 commit request id matches order", reservation.commit_request_id === order.inventory_commit_request_id);
    const lines = await inv.lines(reservation.id);
    const movements = await inv.movements(reservation.id);
    check("exactly one movement per reserved product", movements.length === lines.length && new Set(movements.map((m) => m.product_id)).size === movements.length, `${movements.length} movements / ${lines.length} lines`);
    const totalOut = movements.reduce((s, m) => s - m.quantity_delta, 0);
    check("movement quantity equals purchased quantity", totalOut === purchased, `${totalOut} vs ${purchased}`);
    for (const m of movements) {
      check(`movement ${m.id.slice(0, 8)} attribution`, m.movement_type === "stock_out" && m.source_type === "adelaide_wholesale_tyres" && m.actor_type === "integration" && m.actor_user_id === null && m.source_id === order.reference && m.external_reservation_id === reservation.id && Boolean(m.request_id),
        `${m.movement_type}/${m.source_type}/${m.actor_type}/ref=${m.source_id}`);
    }
    for (const line of lines) {
      const b = await inv.balance(line.inventory_product_id, reservation.location_id);
      check(`balance sane for product ${line.inventory_product_id.slice(0, 8)}`, Boolean(b) && b.on_hand >= 0 && b.reserved >= 0 && b.reserved <= b.on_hand, b ? `on_hand=${b.on_hand} reserved=${b.reserved}` : "missing");
    }
    // Website availability reflects the ledger for each purchased tyre.
    const slugs = order.lines.map((l) => getTyreById(l.id)?.slug).filter(Boolean);
    const res = await fetch(`${BASE}/api/inventory/availability`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs }) });
    const site = res.ok ? (await res.json()).items : [];
    for (const l of order.lines) {
      const tyre = getTyreById(l.id); const item = site.find((i) => i.slug === tyre?.slug);
      const mappingId = inventoryMappingIdForProduct(l.id)?.toLowerCase();
      const line = lines.find((x) => String(x.mapping_id).toLowerCase() === mappingId);
      const b = line ? await inv.balance(line.inventory_product_id, reservation.location_id) : null;
      check(`website availability for ${tyre?.slug ?? l.id} equals 247 available`, Boolean(item) && Boolean(b) && item.available === b.on_hand - b.reserved, item ? `site=${item.available} 247=${b ? b.on_hand - b.reserved : "?"}` : "site unavailable");
    }
  }
  const inv2 = await inv.invariants();
  check("ledger invariants", Object.values(inv2).every((v) => v === 0 || typeof v === "string"), JSON.stringify(inv2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
} finally {
  await Promise.allSettled([awt.end({ timeout: 2 }), inv.end()]);
}
