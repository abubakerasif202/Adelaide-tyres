import { randomUUID } from "node:crypto";

/**
 * Minimal fetch-only client for the disposable LOCAL 247 Supabase project.
 * Used to seed a mapped product with stock and to read the authoritative
 * ledger back. It mirrors 247's own integration fixtures (an Admin plus a REG
 * Manager) and cleans them up afterwards. Never points at production.
 */
const FORBIDDEN_PROJECT_REFS = ["ezedirsnhtbaxselqeao", "afefdlvepdbtaxoscwew"];
const PASSWORD = "InventoryPhase1!Fixture123";

export function requiredEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  return missing;
}

export async function createInventoryHarness() {
  const url = process.env.SUPABASE_TEST_URL;
  const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
  const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  if (FORBIDDEN_PROJECT_REFS.some((ref) => url.includes(ref))) throw new Error("Refusing to run against a production 247 project.");
  if (process.env.SUPABASE_TEST_ALLOW_DESTRUCTIVE !== "true") throw new Error("Set SUPABASE_TEST_ALLOW_DESTRUCTIVE=true for the disposable local project.");

  const serviceHeaders = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };
  const userIds = [];

  async function request(path, init, headers) {
    const response = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const error = new Error(`${init?.method ?? "GET"} ${path} -> ${response.status}: ${typeof body === "string" ? body : body?.message ?? body?.msg ?? JSON.stringify(body)}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  const serviceRpc = (name, args) => request(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) }, serviceHeaders);
  const serviceSelect = (table, query) => request(`/rest/v1/${table}?${query}`, { method: "GET" }, serviceHeaders);

  async function makeUser(label, profile, permissions = []) {
    const email = `awt-e2e-${randomUUID().slice(0, 8)}-${label}@example.test`;
    const user = await request("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }) }, serviceHeaders);
    userIds.push(user.id);
    await request("/rest/v1/user_profiles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, display_name: `E2E ${label}`, ...profile }) }, serviceHeaders);
    if (permissions.length) {
      await request("/rest/v1/manager_permissions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(permissions.map((permission_key) => ({ user_id: user.id, permission_key, enabled: true }))) }, serviceHeaders);
    }
    const session = await request("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password: PASSWORD }) }, { apikey: anonKey, "content-type": "application/json" });
    const headers = { apikey: anonKey, authorization: `Bearer ${session.access_token}`, "content-type": "application/json" };
    return { id: user.id, rpc: (name, args) => request(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) }, headers) };
  }

  const locations = await serviceSelect("locations", "select=id,code&code=in.(LON,REG)");
  const regLocationId = locations.find((l) => l.code === "REG").id;
  const admin = await makeUser("admin", { role: "admin", location_id: null });
  const manager = await makeUser("reg", { role: "manager", location_id: regLocationId }, ["inventory.view", "inventory.stock_in", "inventory.stock_out"]);

  return {
    regLocationId,
    /** Creates an isolated 247 tyre, binds it to an Adelaide website product id with the canonical mapping id, and stocks it at REG. */
    async seedMappedProduct({ websiteProductId, mappingId, size, onHand }) {
      const productId = await admin.rpc("create_product", {
        p_name: `AWT E2E ${websiteProductId} ${randomUUID().slice(0, 6)}`,
        p_category_code: "truck_tyre",
        p_selling_price_incl_gst: 500,
        p_tyre_condition: "new",
        p_tyre_brand: "AWT E2E",
        p_tyre_size: size,
      });
      await serviceRpc("upsert_adelaide_product_mapping", { p_mapping_id: mappingId, p_website_product_id: websiteProductId, p_inventory_product_id: productId });
      if (onHand > 0) await this.stockIn(productId, onHand);
      return productId;
    },
    stockIn(productId, quantity) {
      return manager.rpc("post_inventory_movement", {
        p_request_id: randomUUID(), p_product_id: productId, p_location_id: regLocationId, p_quantity_delta: quantity,
        p_movement_type: "quick_stock_in", p_reason: "E2E opening stock", p_inbound_unit_cost: 50,
        p_used_tyre_unit_id: null, p_source_type: null, p_source_id: null,
      });
    },
    /** A legitimate internal 247 sale (POS / job / manual stock-out) by a 247 manager. */
    internalStockOut(productId, quantity) {
      return manager.rpc("post_inventory_movement", {
        p_request_id: randomUUID(), p_product_id: productId, p_location_id: regLocationId, p_quantity_delta: -quantity,
        p_movement_type: "stock_out", p_reason: "E2E internal POS sale", p_inbound_unit_cost: null,
        p_used_tyre_unit_id: null, p_source_type: null, p_source_id: null,
      });
    },
    async balance(productId) {
      const rows = await serviceSelect("inventory_balances", `select=on_hand,reserved&product_id=eq.${productId}&location_id=eq.${regLocationId}`);
      const row = rows[0] ?? { on_hand: 0, reserved: 0 };
      return { on_hand: row.on_hand, reserved: row.reserved, available: row.on_hand - row.reserved };
    },
    movements(productId) {
      return serviceSelect("inventory_movements", `select=quantity_delta,movement_type,source_type,source_id,actor_type,actor_user_id,integration_client_id,external_reservation_id,request_id&product_id=eq.${productId}&source_type=eq.adelaide_wholesale_tyres&order=created_at.asc`);
    },
    reservations(orderReference) {
      return serviceSelect("adelaide_inventory_reservations", `select=id,status,external_order_reference,request_id,expires_at,committed_at,released_at&external_order_reference=eq.${encodeURIComponent(orderReference)}`);
    },
    reservationLines(reservationId) {
      return serviceSelect("adelaide_inventory_reservation_lines", `select=mapping_id,inventory_product_id,quantity&reservation_id=eq.${reservationId}`);
    },
    auditEvents(reservationId) {
      return serviceSelect("audit_events", `select=event_type,actor_type,actor_role,integration_client_id,details&entity_id=eq.${reservationId}&order=created_at.asc`);
    },
    async cleanup() {
      await Promise.allSettled(userIds.map((id) => request(`/auth/v1/admin/users/${id}`, { method: "DELETE" }, serviceHeaders)));
    },
  };
}
