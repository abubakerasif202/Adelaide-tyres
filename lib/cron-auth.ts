import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Constant-time,
 * length-checked, and closed when no secret is configured.
 */
export function isAuthorisedCronRequest(request: Request, expected = process.env.CRON_SECRET): boolean {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
