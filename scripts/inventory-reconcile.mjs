#!/usr/bin/env node
// Read-only reconciliation of the Adelaide ↔ 247 inventory integration.
//
//   node --conditions=react-server scripts/inventory-reconcile.mjs [--json]
//
// Always checks the static product mapping (24 mapped / 1 unmapped / 0
// ambiguous, unique ids, md5-derived identity). When DATABASE_URL (Adelaide
// order store) and INVENTORY_DATABASE_URL (247 Postgres, admin/service
// connection) are both set it also cross-checks orders against 247's
// reservations, balances and sale movements. Nothing is ever corrected here.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { getAllTyres } from "../lib/catalogue.ts";
import { inventoryMappingIdForProduct, inventoryMappingSummary } from "../lib/inventory/mapping.ts";

const UNMAPPED = { brand: "Greforce", pattern: "G-PILOT X1", size: "295/80R22.5" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const md5Uuid = (text) => {
  const hex = createHash("md5").update(text).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export function reconcileMapping() {
  const findings = [];
  const tyres = getAllTyres();
  const mapped = tyres.filter((t) => inventoryMappingIdForProduct(t.id));
  const unmapped = tyres.filter((t) => !inventoryMappingIdForProduct(t.id));
  const ids = mapped.map((t) => inventoryMappingIdForProduct(t.id));
  if (mapped.length !== 24) findings.push({ severity: "ERROR", check: "mapped_count", subject: String(mapped.length) });
  if (unmapped.length !== 1) findings.push({ severity: "ERROR", check: "unmapped_count", subject: String(unmapped.length) });
  if (new Set(ids).size !== ids.length) findings.push({ severity: "ERROR", check: "duplicate_mapping_id", subject: ids.filter((id, i) => ids.indexOf(id) !== i).join(",") });
  for (const tyre of mapped) {
    const id = inventoryMappingIdForProduct(tyre.id);
    if (!UUID.test(id)) findings.push({ severity: "ERROR", check: "invalid_mapping_id", subject: tyre.id });
    if (id.toLowerCase() !== md5Uuid(`adelaide-wholesale-tyres:${tyre.id}`)) findings.push({ severity: "ERROR", check: "mapping_id_not_derived_from_product", subject: tyre.id });
  }
  for (const tyre of unmapped) {
    const expected = tyre.brand.toLowerCase() === UNMAPPED.brand.toLowerCase() && /g-pilot x1/i.test(tyre.pattern) && tyre.size === UNMAPPED.size;
    if (!expected) findings.push({ severity: "ERROR", check: "unexpected_unmapped_product", subject: tyre.id });
  }
  const report = JSON.parse(readFileSync(new URL("../docs/inventory-mapping-report.json", import.meta.url), "utf8"));
  if (report.summary.matched !== mapped.length || report.summary.unmatched !== unmapped.length || report.summary.ambiguous !== 0) {
    findings.push({ severity: "ERROR", check: "mapping_report_stale", subject: JSON.stringify(report.summary) });
  }
  if (inventoryMappingSummary.mapped !== mapped.length || inventoryMappingSummary.unmatched !== unmapped.length) {
    findings.push({ severity: "ERROR", check: "mapping_summary_stale", subject: JSON.stringify(inventoryMappingSummary) });
  }
  return { summary: { mapped: mapped.length, unmapped: unmapped.length, ambiguous: 0, unmappedProducts: unmapped.map((t) => `${t.brand} / ${t.pattern} / ${t.size}`) }, findings };
}

export async function reconcileLedger({ adelaideUrl, inventoryUrl }) {
  const findings = [];
  const awt = postgres(adelaideUrl, { prepare: false, max: 1 });
  const inv = postgres(inventoryUrl, { prepare: false, max: 1 });
  try {
    const orders = await awt`select reference, status, inventory_status, inventory_reservation_id, inventory_commit_request_id from orders where inventory_reservation_id is not null`;
    const reservationIds = orders.map((o) => o.inventory_reservation_id);
    const reservations = reservationIds.length ? await inv`select id, status, external_order_reference, commit_request_id from public.adelaide_inventory_reservations where id = any(${reservationIds}::uuid[])` : [];
    const byId = new Map(reservations.map((r) => [r.id, r]));
    const movements = await inv`select external_reservation_id, product_id, source_id, count(*)::int as n from public.inventory_movements where source_type = 'adelaide_wholesale_tyres' group by 1, 2, 3`;
    const movementsByReservation = new Map();
    for (const m of movements) movementsByReservation.set(m.external_reservation_id, [...(movementsByReservation.get(m.external_reservation_id) ?? []), m]);

    for (const order of orders) {
      const reservation = byId.get(order.inventory_reservation_id);
      if (!reservation) { findings.push({ severity: "ERROR", check: "order_reservation_missing_in_247", subject: order.reference }); continue; }
      if (reservation.external_order_reference !== order.reference) findings.push({ severity: "ERROR", check: "reservation_order_reference_mismatch", subject: order.reference });
      const moved = movementsByReservation.get(reservation.id) ?? [];
      if (order.inventory_status === "committed") {
        if (reservation.status !== "committed") findings.push({ severity: "ERROR", check: "committed_order_reservation_not_committed", subject: order.reference });
        if (moved.length === 0) findings.push({ severity: "ERROR", check: "committed_order_missing_movement", subject: order.reference });
        if (reservation.commit_request_id && order.inventory_commit_request_id && reservation.commit_request_id !== order.inventory_commit_request_id) findings.push({ severity: "ERROR", check: "commit_request_id_mismatch", subject: order.reference });
      }
      if (order.inventory_status === "reserved") {
        if (reservation.status === "committed") findings.push({ severity: "ERROR", check: "247_committed_but_order_not_marked", subject: order.reference });
        if (reservation.status === "expired") findings.push({ severity: "WARN", check: "reserved_order_hold_expired", subject: order.reference });
        if (reservation.status === "released") findings.push({ severity: "WARN", check: "reserved_order_hold_released", subject: order.reference });
      }
      if (order.inventory_status === "released" && !["released", "expired"].includes(reservation.status)) findings.push({ severity: "ERROR", check: "released_order_reservation_not_released", subject: order.reference });
      if (order.status === "paid" && order.inventory_status !== "committed") findings.push({ severity: "WARN", check: "paid_order_inventory_not_committed", subject: order.reference });
      if (moved.some((m) => m.n > 1)) findings.push({ severity: "ERROR", check: "duplicate_inventory_commit", subject: order.reference });
    }

    const references = new Set(orders.map((o) => o.reference));
    for (const m of movements) {
      if (!m.source_id) findings.push({ severity: "ERROR", check: "movement_missing_order_reference", subject: m.external_reservation_id });
      else if (!references.has(m.source_id)) findings.push({ severity: "WARN", check: "movement_order_not_in_this_store", subject: m.source_id });
      if (!m.external_reservation_id) findings.push({ severity: "ERROR", check: "movement_missing_reservation", subject: m.source_id ?? "?" });
    }

    const [balances] = await inv`select count(*)::int as bad from public.inventory_balances where on_hand < 0 or reserved < 0 or reserved > on_hand`;
    if (balances.bad > 0) findings.push({ severity: "ERROR", check: "impossible_balance", subject: String(balances.bad) });
    const [dupMappings] = await inv`select count(*)::int as n from (select inventory_product_id from public.adelaide_product_mappings group by 1 having count(*) > 1) d`;
    if (dupMappings.n > 0) findings.push({ severity: "ERROR", check: "duplicate_247_mapping", subject: String(dupMappings.n) });
    const [invalidIds] = await inv`select count(*)::int as n from public.adelaide_product_mappings m left join public.products p on p.id = m.inventory_product_id where p.id is null`;
    if (invalidIds.n > 0) findings.push({ severity: "ERROR", check: "mapping_invalid_inventory_id", subject: String(invalidIds.n) });
    const [staleActive] = await inv`select count(*)::int as n from public.adelaide_inventory_reservations where status = 'active' and expires_at <= now()`;
    if (staleActive.n > 0) findings.push({ severity: "WARN", check: "active_expired_reservation", subject: String(staleActive.n) });
    const [dupCommits] = await inv`select count(*)::int as n from (select external_reservation_id, product_id from public.inventory_movements where external_reservation_id is not null group by 1, 2 having count(*) > 1) d`;
    if (dupCommits.n > 0) findings.push({ severity: "ERROR", check: "duplicate_inventory_commit_ledger", subject: String(dupCommits.n) });
    const [committedNoMove] = await inv`select count(*)::int as n from public.adelaide_inventory_reservations r where r.status = 'committed' and not exists (select 1 from public.inventory_movements m where m.external_reservation_id = r.id)`;
    if (committedNoMove.n > 0) findings.push({ severity: "ERROR", check: "committed_reservation_without_sale", subject: String(committedNoMove.n) });
    const seeded = await inv`select website_product_id, id from public.adelaide_product_mappings`;
    const seededByWebsiteId = new Map(seeded.map((r) => [r.website_product_id, r.id]));
    for (const tyre of getAllTyres()) {
      const id = inventoryMappingIdForProduct(tyre.id);
      if (!id) continue;
      const remote = seededByWebsiteId.get(tyre.id);
      if (!remote) findings.push({ severity: "WARN", check: "mapping_not_seeded_in_247", subject: tyre.id });
      else if (remote.toLowerCase() !== id.toLowerCase()) findings.push({ severity: "ERROR", check: "mapping_id_disagrees_with_247", subject: tyre.id });
    }
    return { orders: orders.length, reservations: reservations.length, movements: movements.length, findings };
  } finally {
    await Promise.allSettled([awt.end({ timeout: 2 }), inv.end({ timeout: 2 })]);
  }
}

const isMain = process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  const mapping = reconcileMapping();
  const output = { mapping, ledger: null };
  if (process.env.DATABASE_URL && process.env.INVENTORY_DATABASE_URL) {
    output.ledger = await reconcileLedger({ adelaideUrl: process.env.DATABASE_URL, inventoryUrl: process.env.INVENTORY_DATABASE_URL });
  }
  const findings = [...mapping.findings, ...(output.ledger?.findings ?? [])];
  if (process.argv.includes("--json")) console.log(JSON.stringify(output, null, 2));
  else {
    console.log(`Mapping: mapped ${mapping.summary.mapped}, unmapped ${mapping.summary.unmapped}, ambiguous ${mapping.summary.ambiguous}`);
    for (const name of mapping.summary.unmappedProducts) console.log(`  unmapped: ${name}`);
    if (output.ledger) console.log(`Ledger: ${output.ledger.orders} orders with holds, ${output.ledger.reservations} matching 247 reservations, ${output.ledger.movements} Adelaide sale movements`);
    else console.log("Ledger: skipped (set DATABASE_URL and INVENTORY_DATABASE_URL to cross-check)");
    for (const f of findings) console.log(`${f.severity.padEnd(5)} ${f.check} ${f.subject}`);
    if (!findings.length) console.log("No findings.");
  }
  process.exit(findings.some((f) => f.severity === "ERROR") ? 1 : 0);
}
