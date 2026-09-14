import "server-only";
import { randomUUID } from "node:crypto";
import type { OrderStore } from "../order-store.ts";
import { commitInventory, releaseInventory } from "./client.ts";
import { InventoryConflictError } from "./types.ts";
import { errorCodeOf, logInventoryEvent } from "./log.ts";

export type OutboxWorkerDeps = {
  store: OrderStore;
  commit?: typeof commitInventory;
  release?: typeof releaseInventory;
};

export async function processInventoryOutbox(deps: OutboxWorkerDeps, limit = 25, workerId = randomUUID()) {
  let completed = 0;
  let retried = 0;
  let manualReview = 0;
  for (let index = 0; index < limit; index += 1) {
    const work = await deps.store.claimInventoryWork(workerId);
    if (!work) break;
    try {
      if (work.operation === "commit") {
        await (deps.commit ?? commitInventory)(work.reservationId, work.orderReference, work.requestId);
      } else {
        await (deps.release ?? releaseInventory)(work.reservationId, "payment_not_completed", work.requestId);
      }
      await deps.store.completeInventoryWork(work.operationId, workerId);
      completed += 1;
    } catch (error) {
      // A terminal stock conflict includes an expired/released hold. Never
      // force a deduction: the order stays blocked for an operator to
      // atomically reacquire stock in 247 or refund/cancel it.
      const terminal = error instanceof InventoryConflictError || work.attemptCount >= 8;
      await deps.store.retryInventoryWork(work.operationId, workerId, errorCodeOf(error), terminal);
      if (terminal) manualReview += 1; else retried += 1;
      logInventoryEvent(terminal ? "error" : "warn", terminal ? "inventory.outbox.manual_review" : "inventory.outbox.retry", {
        orderReference: work.orderReference,
        reservationId: work.reservationId,
        requestId: work.requestId,
        attempt: work.attemptCount,
        errorCode: errorCodeOf(error),
      });
    }
  }
  return { processed: completed + retried + manualReview, completed, retried, manualReview };
}

