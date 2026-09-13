import http from "node:http";

/**
 * Fault-injecting reverse proxy placed between the Adelaide server and the
 * real local 247 inventory app. It never changes a request; it only decides
 * whether the response reaches Adelaide, which is exactly the class of
 * distributed failure the integration must survive.
 *
 * Modes:
 *   pass          forward normally
 *   offline       refuse every request (247 down)
 *   drop-response forward, wait for 247 to finish, then sever the connection
 *                 so Adelaide sees a network error even though 247 succeeded
 *   delay         forward after `delayMs` (used to provoke client timeouts)
 */
export function createInventoryProxy({ upstream, port }) {
  const target = new URL(upstream);
  const state = { mode: "pass", delayMs: 0, dropOnce: false, offlineOnce: false };
  const recorded = [];

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      const body = Buffer.concat(chunks);
      const entry = { method: req.method, path: req.url, headers: { ...req.headers }, body: body.toString("utf8"), status: null, responseBody: null, mode: state.mode };
      recorded.push(entry);

      if (state.mode === "offline" || state.offlineOnce) {
        state.offlineOnce = false;
        entry.status = "offline";
        req.socket.destroy();
        return;
      }
      if (state.mode === "delay" && state.delayMs > 0) await new Promise((r) => setTimeout(r, state.delayMs));

      const headers = { ...req.headers, host: target.host };
      delete headers.connection;
      const upstreamReq = http.request(
        { hostname: target.hostname, port: target.port, path: req.url, method: req.method, headers },
        (upstreamRes) => {
          const out = [];
          upstreamRes.on("data", (c) => out.push(c));
          upstreamRes.on("end", () => {
            const payload = Buffer.concat(out);
            entry.status = upstreamRes.statusCode;
            entry.responseBody = payload.toString("utf8");
            if (state.mode === "drop-response" || state.dropOnce) {
              state.dropOnce = false;
              entry.dropped = true;
              // 247 has already committed its side effect; Adelaide never hears back.
              req.socket.destroy();
              return;
            }
            res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
            res.end(payload);
          });
        },
      );
      upstreamReq.on("error", (error) => {
        entry.status = "upstream-error";
        entry.error = error.message;
        if (!res.headersSent) { res.writeHead(502, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "PROXY_UPSTREAM_ERROR" })); }
      });
      upstreamReq.end(body);
    });
  });

  return {
    recorded,
    state,
    setMode(mode, options = {}) { state.mode = mode; state.delayMs = options.delayMs ?? 0; },
    dropNextResponse() { state.dropOnce = true; },
    refuseNextRequest() { state.offlineOnce = true; },
    start: () => new Promise((resolve) => server.listen(port, "127.0.0.1", resolve)),
    stop: () => new Promise((resolve) => server.close(() => resolve())),
    /** Requests forwarded to a given 247 path, most recent last. */
    requestsTo: (predicate) => recorded.filter((entry) => predicate(entry)),
  };
}
