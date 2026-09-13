import 'server-only';

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { getTyreById, getTyreBySlug } from '../catalogue.ts';
import { inventoryMappingIdForProduct } from './mapping.ts';
import { InventoryConflictError, InventoryUnavailableError, type InventoryAvailability, type InventoryReservation } from './types.ts';

type FetchLike = typeof fetch;
type HttpMethod = 'POST' | 'DELETE';

/**
 * How long 247 holds stock for a checkout. Must outlive the Stripe Checkout
 * Session (`STRIPE_SESSION_TTL_MINUTES`) so a customer who pays at the last
 * moment can never hit an already-expired hold. 247 caps holds at 2 hours.
 */
export const INVENTORY_HOLD_MINUTES = 45;
export const STRIPE_SESSION_TTL_MINUTES = 30;
/** Hard ceiling per line; mirrors 247's schema so a bad request is refused here first. */
export const MAX_LINE_QUANTITY = 1000;
const REQUEST_TIMEOUT_MS = 8_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function config() {
  const baseUrl = process.env.INVENTORY_API_URL;
  const clientId = process.env.INVENTORY_CLIENT_ID;
  const secret = process.env.INVENTORY_CLIENT_SECRET;
  const locationId = process.env.INVENTORY_LOCATION_ID;
  if (!baseUrl || !clientId || !secret || !locationId) throw new InventoryUnavailableError();
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new InventoryUnavailableError(); }
  // Plain HTTP is only ever tolerated for a loopback 247 instance (local
  // cross-system testing) and only when explicitly enabled.
  const loopback = LOOPBACK_HOSTS.has(url.hostname) && process.env.INVENTORY_ALLOW_INSECURE_LOOPBACK === 'true';
  if (url.protocol !== 'https:' && !loopback) throw new InventoryUnavailableError();
  return { baseUrl: url.origin, clientId, secret };
}

export function sha256Hex(body: string): string { return createHash('sha256').update(body).digest('hex'); }

/** Canonical signing string shared with 247: METHOD\npath\ntimestamp\nrequestId\nsha256(body). */
export function signingString(method: string, pathname: string, timestamp: string, requestId: string, bodyHash: string): string {
  return `${method.toUpperCase()}\n${pathname}\n${timestamp}\n${requestId}\n${bodyHash}`;
}

export function signRequest(method: string, pathname: string, timestamp: string, requestId: string, body: string, secret: string): string {
  return createHmac('sha256', secret).update(signingString(method, pathname, timestamp, requestId, sha256Hex(body))).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function call<T>(method: HttpMethod, path: string, body: unknown, requestId: string, validate: (payload: unknown) => T | null, fetcher: FetchLike = fetch): Promise<T> {
  const current = config();
  if (!UUID.test(requestId)) throw new InventoryUnavailableError();
  const raw = JSON.stringify(body);
  const timestamp = String(Date.now());
  let response: Response;
  try {
    response = await fetcher(`${current.baseUrl}${path}`, {
      method, cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'content-type': 'application/json',
        'x-awt-client-id': current.clientId,
        'x-awt-timestamp': timestamp,
        'x-awt-request-id': requestId,
        'x-awt-signature': signRequest(method, path, timestamp, requestId, raw, current.secret),
      },
      body: raw,
    });
  } catch {
    // Timeout, DNS, connection refused: fail closed.
    throw new InventoryUnavailableError();
  }
  let payload: unknown = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.error === 'string' ? payload.error : '';
    if (response.status === 409 || /INSUFFICIENT|RESERVATION|INACTIVE|UNKNOWN_PRODUCT/.test(code)) {
      throw new InventoryConflictError('One or more tyres are no longer available in the requested quantity.');
    }
    throw new InventoryUnavailableError();
  }
  const value = validate(payload);
  if (value === null) throw new InventoryUnavailableError();
  return value;
}

function stateFor(available: number): InventoryAvailability['state'] {
  if (available <= 0) return 'out_of_stock';
  if (available <= 4) return 'low_stock';
  return 'in_stock';
}

type AvailabilityPayload = { items: { inventoryMappingId: string; available: number; updatedAt: string }[] };
function validateAvailability(payload: unknown): AvailabilityPayload | null {
  if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
  const items: AvailabilityPayload['items'] = [];
  for (const item of payload.items) {
    if (!isRecord(item) || typeof item.inventoryMappingId !== 'string' || !UUID.test(item.inventoryMappingId)) return null;
    if (typeof item.available !== 'number' || !Number.isSafeInteger(item.available)) return null;
    items.push({ inventoryMappingId: item.inventoryMappingId, available: item.available, updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '' });
  }
  return { items };
}

function validateReservation(payload: unknown): InventoryReservation | null {
  if (!isRecord(payload)) return null;
  const id = payload.reservation_id ?? payload.reservationId;
  const status = payload.status;
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  if (status !== 'active' && status !== 'committed' && status !== 'released' && status !== 'expired') return null;
  const expiresAt = payload.expires_at ?? payload.expiresAt;
  const orderReference = payload.order_reference ?? payload.orderReference;
  return {
    reservationId: id,
    status,
    expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
    orderReference: typeof orderReference === 'string' ? orderReference : '',
  };
}

export async function getAvailabilityForSlugs(slugs: string[], fetcher?: FetchLike): Promise<InventoryAvailability[]> {
  const requested = [...new Set(slugs)].map((slug) => ({ slug, tyre: getTyreBySlug(slug) }));
  const mapped = requested.flatMap(({ slug, tyre }) => {
    const mappingId = tyre ? inventoryMappingIdForProduct(tyre.id) : null;
    return mappingId ? [{ slug, mappingId }] : [];
  });
  const fallback = requested.filter(({ slug }) => !mapped.some((item) => item.slug === slug)).map(({ slug }) => ({ slug, state: 'unmapped' as const, available: null, updatedAt: null }));
  if (!mapped.length) return fallback;
  const payload = await call('POST', '/api/integrations/adelaide/availability', { items: mapped.map((item) => ({ inventoryMappingId: item.mappingId })) }, randomUUID(), validateAvailability, fetcher);
  const byMapping = new Map(payload.items.map((item) => [item.inventoryMappingId.toLowerCase(), item]));
  return [
    ...mapped.map(({ slug, mappingId }) => {
      const item = byMapping.get(mappingId.toLowerCase());
      // A mapped tyre 247 did not report (inactive, no balance row) is not
      // purchasable: never assume stock that the source of truth did not state.
      if (!item) return { slug, state: 'unavailable' as const, available: null, updatedAt: null };
      return { slug, state: stateFor(item.available), available: item.available, updatedAt: item.updatedAt || null };
    }),
    ...fallback,
  ];
}

/**
 * Collapses cart lines to one line per catalogue product with a validated
 * integer quantity. Browser input never reaches 247 without passing here.
 */
export function aggregateReservationLines(lines: { id: string; quantity: number }[]): { id: string; quantity: number }[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (typeof line.id !== 'string' || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new InventoryConflictError('One or more quantities are invalid.');
    }
    totals.set(line.id, (totals.get(line.id) ?? 0) + line.quantity);
  }
  const aggregated = [...totals].map(([id, quantity]) => ({ id, quantity }));
  if (aggregated.some((line) => line.quantity > MAX_LINE_QUANTITY)) throw new InventoryConflictError('One or more quantities are invalid.');
  return aggregated;
}

export async function reserveInventory(orderReference: string, lines: { id: string; quantity: number }[], requestId: string = randomUUID(), fetcher?: FetchLike): Promise<InventoryReservation> {
  const aggregated = aggregateReservationLines(lines);
  if (!aggregated.length) throw new InventoryConflictError('Your cart is empty.');
  // Lines carry the server-side catalogue id (validateOrderLines output); the
  // slug is accepted as a fallback. A browser can never name a 247 mapping.
  const mapped = aggregated.map(({ id, quantity }) => {
    const tyre = getTyreById(id) ?? getTyreBySlug(id);
    return { mappingId: tyre ? inventoryMappingIdForProduct(tyre.id) : null, quantity };
  });
  if (mapped.some((line) => !line.mappingId)) throw new InventoryConflictError('One or more tyres require availability confirmation. Please contact us.');
  const expiresAt = new Date(Date.now() + INVENTORY_HOLD_MINUTES * 60 * 1000).toISOString();
  return call(
    'POST',
    '/api/integrations/adelaide/reservations',
    { orderReference, expiresAt, items: mapped.map((line) => ({ inventoryMappingId: line.mappingId!, quantity: line.quantity })) },
    requestId,
    validateReservation,
    fetcher,
  );
}

export async function releaseInventory(reservationId: string, reason: string, requestId: string = randomUUID(), fetcher?: FetchLike): Promise<InventoryReservation> {
  if (!UUID.test(reservationId)) throw new InventoryUnavailableError();
  return call('DELETE', `/api/integrations/adelaide/reservations/${reservationId}`, { reason }, requestId, validateReservation, fetcher);
}

export async function commitInventory(reservationId: string, orderReference: string, requestId: string, fetcher?: FetchLike): Promise<InventoryReservation> {
  if (!UUID.test(reservationId)) throw new InventoryUnavailableError();
  const result = await call('POST', '/api/integrations/adelaide/sales/commit', { reservationId, orderReference }, requestId, validateReservation, fetcher);
  // Defence in depth: only a committed result may mark the order committed.
  if (result.status !== 'committed') throw new InventoryConflictError('The stock hold for this order is no longer active.');
  return result;
}
