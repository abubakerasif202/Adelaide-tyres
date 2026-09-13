/**
 * Concise structured server logs for the inventory integration. Only the
 * whitelisted operational fields below are ever emitted — never secrets,
 * request bodies, customer contact details or payment data.
 */
export type InventoryLogFields = {
  route?: string;
  method?: string;
  status?: number | string;
  durationMs?: number;
  attempt?: number;
  errorCode?: string;
  orderReference?: string;
  reservationId?: string;
  requestId?: string;
  stripeEventId?: string;
  stripeEventType?: string;
  checkoutSessionId?: string;
  detail?: string;
};

const ALLOWED: ReadonlyArray<keyof InventoryLogFields> = [
  'route', 'method', 'status', 'durationMs', 'attempt', 'errorCode', 'orderReference', 'reservationId',
  'requestId', 'stripeEventId', 'stripeEventType', 'checkoutSessionId', 'detail',
];

export function logInventoryEvent(level: 'info' | 'warn' | 'error', event: string, fields: InventoryLogFields = {}): void {
  const entry: Record<string, unknown> = { event, at: new Date().toISOString() };
  for (const key of ALLOWED) {
    const value = fields[key];
    if (value === undefined || value === null || value === '') continue;
    entry[key] = typeof value === 'string' ? value.slice(0, 200) : value;
  }
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

/** Reduces an unknown thrown value to a short, safe error code for logs. */
export function errorCodeOf(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'TIMEOUT';
    if (/fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(error.message)) return 'NETWORK';
    return error.name && error.name !== 'Error' ? error.name : 'ERROR';
  }
  return 'ERROR';
}
