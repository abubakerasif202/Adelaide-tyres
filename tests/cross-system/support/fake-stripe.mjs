import http from "node:http";
import { randomUUID } from "node:crypto";

/**
 * Loopback stand-in for the two Stripe API calls Adelaide makes during
 * checkout: creating a Checkout Session and retrieving it on the success page.
 * Payment itself is signalled the way production does it — by a signed webhook
 * event the test posts to Adelaide — so the webhook remains authoritative.
 */
export function createFakeStripe({ port }) {
  const sessions = new Map();
  const created = [];
  const notifications = [];
  const state = { failCreate: false };

  function parseForm(raw) {
    const params = new URLSearchParams(raw);
    const lineItems = [];
    for (const [key, value] of params) {
      // Stripe's form encoding: line_items[0][quantity], line_items[0][price_data][unit_amount]
      const match = /^line_items\[(\d+)\]\[(quantity|price_data)\](\[unit_amount\])?$/.exec(key);
      if (!match) continue;
      const index = Number(match[1]);
      lineItems[index] ??= {};
      if (match[2] === "quantity") lineItems[index].quantity = Number(value);
      else if (match[3]) lineItems[index].unitAmount = Number(value);
    }
    return { params, lineItems };
  }

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const json = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
      const url = new URL(req.url, "http://127.0.0.1");

      // Loopback notification stand-in (Resend-shaped) so paid orders can complete
      // their business notification without email egress.
      if (req.method === "POST" && url.pathname === "/emails") {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
        notifications.push({ authorization: req.headers.authorization ?? null, body: parsed });
        return json(200, { id: `email_${randomUUID()}` });
      }

      if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
        if (state.failCreate) return json(500, { error: { type: "api_error", message: "stand-in failure" } });
        const { params, lineItems } = parseForm(raw);
        const id = `cs_test_${randomUUID().replace(/-/g, "")}`;
        const amountTotal = lineItems.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitAmount ?? 0), 0);
        const session = {
          id,
          object: "checkout.session",
          url: `http://127.0.0.1:${port}/pay/${id}`,
          mode: params.get("mode"),
          payment_status: "unpaid",
          status: "open",
          amount_total: amountTotal,
          currency: "aud",
          customer_email: params.get("customer_email"),
          client_reference_id: params.get("client_reference_id"),
          metadata: { reference: params.get("metadata[reference]") },
          expires_at: Number(params.get("expires_at")),
          payment_intent: `pi_test_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
          lineItems,
        };
        sessions.set(id, session);
        created.push({ session, form: Object.fromEntries(params) });
        return json(200, session);
      }
      const retrieve = /^\/v1\/checkout\/sessions\/([^/]+)$/.exec(url.pathname);
      if (req.method === "GET" && retrieve) {
        const session = sessions.get(retrieve[1]);
        return session ? json(200, session) : json(404, { error: { type: "invalid_request_error", message: "No such checkout.session" } });
      }
      json(404, { error: { type: "invalid_request_error", message: `Unhandled ${req.method} ${url.pathname}` } });
    });
  });

  return {
    sessions,
    created,
    notifications,
    state,
    /** Marks the stand-in session paid so the success page sees Stripe's view too. */
    markPaid(id) { const s = sessions.get(id); if (s) { s.payment_status = "paid"; s.status = "complete"; } },
    start: () => new Promise((resolve) => server.listen(port, "127.0.0.1", resolve)),
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
