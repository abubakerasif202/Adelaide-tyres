"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAllTyres } from '@/lib/catalogue';
import type { InventoryAvailability } from './types';

type AvailabilityContextValue = { bySlug: ReadonlyMap<string, InventoryAvailability>; refresh: () => Promise<void> };
const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

const unknown = (slug: string): InventoryAvailability => ({ slug, state: 'unavailable', available: null, updatedAt: null });

export function InventoryAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [bySlug, setBySlug] = useState<ReadonlyMap<string, InventoryAvailability>>(new Map());
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/availability', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slugs: getAllTyres().map((tyre) => tyre.slug) }),
      });
      if (!response.ok) throw new Error('availability unavailable');
      const payload = await response.json() as { items: InventoryAvailability[] };
      setBySlug(new Map(payload.items.map((item) => [item.slug, item])));
    } catch {
      // The safe fallback intentionally has no stock quantity and disables purchase.
      setBySlug(new Map());
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
