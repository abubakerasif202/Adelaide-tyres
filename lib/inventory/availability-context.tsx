"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAllTyres } from '@/lib/catalogue';
import type { InventoryAvailability } from './types';

type AvailabilityContextValue = { bySlug: ReadonlyMap<string, InventoryAvailability>; refresh: () => Promise<void> };
const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

const unknown = (slug: string): InventoryAvailability => ({ slug, state: 'unavailable', available: null, updatedAt: null });
/**
 * Display-only grace: after a transient read failure the last successful
 * snapshot may keep being shown for at most this long. Checkout never reads
 * this map — every reservation is validated live by 247.
 */
const STALE_DISPLAY_MS = 60_000;

export function InventoryAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [bySlug, setBySlug] = useState<ReadonlyMap<string, InventoryAvailability>>(new Map());
  const lastGoodAt = useRef(0);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/availability', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slugs: getAllTyres().map((tyre) => tyre.slug) }),
      });
      if (!response.ok) throw new Error('availability unavailable');
      const payload = await response.json() as { items: InventoryAvailability[] };
      lastGoodAt.current = Date.now();
      setBySlug(new Map(payload.items.map((item) => [item.slug, item])));
    } catch {
      // Keep the last successful snapshot briefly so one cold-start blip does not
      // flicker every card; beyond the grace window the safe fallback has no
      // quantity and disables purchase. Never a static catalogue figure.
      if (Date.now() - lastGoodAt.current > STALE_DISPLAY_MS) setBySlug(new Map());
    }
  }, []);
  useEffect(() => {
    // Defer the first network synchronization so React does not treat it as a
    // synchronous effect-driven state update during hydration.
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);
  const value = useMemo(() => ({ bySlug, refresh }), [bySlug, refresh]);
  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
}

export function useInventoryAvailability(slug: string): InventoryAvailability {
  const context = useContext(AvailabilityContext);
  if (!context) return unknown(slug);
  return context.bySlug.get(slug) ?? unknown(slug);
}

/** Live availability for every catalogue slug; empty until the first refresh lands. */
export function useInventoryAvailabilityMap(): ReadonlyMap<string, InventoryAvailability> {
  const context = useContext(AvailabilityContext);
  return context?.bySlug ?? EMPTY;
}
const EMPTY: ReadonlyMap<string, InventoryAvailability> = new Map();

/**
 * Upper bound for a cart/checkout quantity control. Live 247 availability caps
 * the selector when it is known; when the feed is down or the tyre is not
 * purchasable the control is left editable and 247 still decides at checkout.
 */
export function useLineQuantityCap(slug: string): number {
  const item = useInventoryAvailabilityMap().get(slug);
  if (item && (item.state === 'in_stock' || item.state === 'low_stock') && item.available != null && item.available > 0) return item.available;
  return MAX_EDITABLE_QUANTITY;
}
const MAX_EDITABLE_QUANTITY = 1000;
