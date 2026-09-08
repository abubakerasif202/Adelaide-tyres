#!/usr/bin/env node
// Recovery for orders stuck mid-fulfilment: an order that was claimed
// (status = 'paid', notify_claimed_at set) but never marked notified,
// because the process handling the webhook was killed (OOM, deploy restart)
// between the claim and the notify/release step. No further webhook
// redelivery can re-claim it — claimFulfilment requires status = 'pending'.
//
// Run on a schedule (cron) or on demand:
//   npm run release-stale-claims -- [minutes]
// (needs --conditions=react-server, same as `npm test` — see package.json)
// Default threshold is 10 minutes. Requires DATABASE_URL or POSTGRES_URL.
import { getOrderStore, resetOrderStoreCache } from "../lib/order-store.ts";

const minutes = Number(process.argv[2] ?? 10);
if (!Number.isFinite(minutes) || minutes <= 0) {
  console.error("Usage: node scripts/release-stale-claims.mjs [minutes-threshold]");
  process.exit(1);
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error("Set DATABASE_URL (or POSTGRES_URL) before running this script.");
  process.exit(1);
}

resetOrderStoreCache();
const store = await getOrderStore();
const released = await store.releaseStaleClaims(minutes);

if (released > 0) {
  console.warn(
    `Released ${released} order(s) stuck in a claimed-but-not-notified state (older than ${minutes}m). ` +
      "They will retry on the next redelivered webhook event, or replay the event manually from the Stripe dashboard.",
  );
} else {
  console.log(`No stale claims older than ${minutes}m.`);
}
