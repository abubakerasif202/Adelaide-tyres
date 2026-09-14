import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorisedCronRequest } from "../../lib/cron-auth.ts";
import { MemoryOrderStore } from "../../lib/order-store-memory.ts";
import { processInventoryOutbox } from "../../lib/inventory/outbox-worker.ts";
import { processOrderNotifications } from "../../lib/inventory/notification-worker.ts";

const request = (authorization) => new Request("https://awt.example.test/api/cron/inventory-outbox", { headers: authorization ? { authorization } : {} });
const SECRET = "cron-secret-for-tests-0123456789";

test("the outbox cron refuses to run without the exact configured secret", () => {
  // Unconfigured: nothing is accepted, not even an empty bearer.
  assert.equal(isAuthorisedCronRequest(request(), undefined), false);
  assert.equal(isAuthorisedCronRequest(request("Bearer "), ""), false);
  assert.equal(isAuthorisedCronRequest(request(), SECRET), false);
  assert.equal(isAuthorisedCronRequest(request("Bearer wrong-secret-of-a-different-len"), SECRET), false);
  assert.equal(isAuthorisedCronRequest(request("Bearer cron-secret-for-tests-012345678X"), SECRET), false, "same length, one byte off");
  assert.equal(isAuthorisedCronRequest(request(`Bearer ${SECRET}`), SECRET), true);
  assert.equal(isAuthorisedCronRequest(request(`bearer ${SECRET}`), SECRET), true, "scheme is case-insensitive");
});

test("an idle cron run reports zero work and touches nothing", async () => {
  const store = new MemoryOrderStore();
  assert.deepEqual(await processInventoryOutbox({ store, commit: async () => { throw new Error("must not be called"); } }, 25), { processed: 0, completed: 0, retried: 0, manualReview: 0 });
  assert.deepEqual(await processOrderNotifications(store, async () => { throw new Error("must not be called"); }), { delivered: 0, failed: 0 });
});
