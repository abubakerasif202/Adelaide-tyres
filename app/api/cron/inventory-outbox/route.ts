import { NextResponse } from "next/server";
import { getOrderStore } from "@/lib/order-store";
import { isAuthorisedCronRequest } from "@/lib/cron-auth";
import { processInventoryOutbox } from "@/lib/inventory/outbox-worker";
import { processOrderNotifications } from "@/lib/inventory/notification-worker";

export const runtime = "nodejs";

/** Scheduled delivery of paid-order inventory commits and staff notifications. */
export async function GET(request: Request) {
  if (!isAuthorisedCronRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const store = await getOrderStore();
  const result = await processInventoryOutbox({ store }, 25);
  const notifications = await processOrderNotifications(store);
  return NextResponse.json({ ...result, notifications }, { headers: { "cache-control": "no-store" } });
}
