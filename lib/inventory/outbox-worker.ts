import "server-only";
import { randomUUID } from "node:crypto";
import { MAX_INVENTORY_ATTEMPTS, type OrderStore } from "../order-store.ts";
import { commitInventory, releaseInventory } from "./client.ts";
import { InventoryConflictError } from "./types.ts";
import { errorCodeOf, logInventoryEvent } from "./log.ts";

export type OutboxWorkerDeps = {
  store: OrderStore;
  /** Injectable only for deterministic tests; production uses 247. */
  commit?: typeof commitInventory;
  release?: typeof releaseInventory;
};

export type OutboxRunSummary = { processed: number; completed: number; retried: number; manualReview: number };

/**
 * Drains durable 247 work (commits for paid orders, releases for orders that
 * did not pay). Every row is claimed under a lease so exactly one worker acts
 * on it at a time; completion and retry are fenced on that lease, so a worker
 * that stalls past its lease cannot overwrite the outcome of the one that
 * replaced it. Never throws — a caller (webhook fast path or cron) must not
 * turn an inventory outcome into an ambiguous Stripe response.
 */
export async function processInventoryOutbox(deps: OutboxWorkerDeps, limit = 25, workerId = randomUUID()): Promise<OutboxRunSummary> {
  const summary: OutboxRunSummary = { processed: 0, completed: 0, retried: 0, manualReview: 0 };
  for (let index = 0; index < limit; index += 1) {
    const work = await deps.store.claimInventoryWork(workerId);
    if (!work) break;
    summary.processed += 1;
    try {
      if (work.operation === "commit") {
        await (deps.commit ?? commitInventory)(work.reservationId, work.orderReference, work.requestId);
      } else {
        await (deps.release ?? releaseInventory)(work.reservationId, "payment_not_completed", work.requestId);
      }
      await deps.store.completeInventoryWork(work.operationId, workerId);
      summary.completed += 1;
    } catch (error) {
      // A stock conflict (hold expired, released, or already sold elsewhere)
      // is terminal: never force a deduction. The order stays paid and blocked
      // for an operator to reacquire stock in 247 or refund it.
      const terminal = error instanceof InventoryConflictError || work.attemptCount >= MAX_INVENTORY_ATTEMPTS;
      await deps.store.retryInventoryWork(work.operationId, workerId, errorCodeOf(error), terminal);
      if (terminal) summary.manualReview += 1; else summary.retried += 1;
      logInventoryEvent(terminal ? "error" : "warn", terminal ? "inventory.outbox.manual_review" : "inventory.outbox.retry", {
        orderReference: work.orderReference,
        reservationId: work.reservationId,
        requestId: work.requestId,
        attempt: work.attemptCount,
        errorCode: errorCodeOf(error),
      });
    }
  }
  return summary;
}
