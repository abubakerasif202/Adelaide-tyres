import { headers } from "next/headers";

/** Best-effort same-origin check for form POSTs. */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type AntiAbuseInput = {
  /** Hidden field — must be empty. */
  honeypot?: unknown;
  /** Client timestamp (ms) when the form was rendered. */
  startedAt?: unknown;
  /** Minimum seconds a genuine user takes to complete the form. */
  minSeconds?: number;
};

export function looksAutomated({
  honeypot,
  startedAt,
  minSeconds = 3,
}: AntiAbuseInput): boolean {
  if (typeof honeypot === "string" && honeypot.trim() !== "") return true;
  if (typeof startedAt === "number" && Number.isFinite(startedAt)) {
    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed >= 0 && elapsed < minSeconds) return true;
  }
  return false;
}

// Per-instance best-effort rate limit. Production WAF limiting still recommended.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export function clampString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}
