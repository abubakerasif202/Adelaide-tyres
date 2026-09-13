import { NextResponse } from 'next/server';
import { getAvailabilityForSlugs } from '@/lib/inventory/client';
import type { InventoryAvailability } from '@/lib/inventory/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { slugs?: unknown };
    if (!Array.isArray(body.slugs) || body.slugs.length > 25 || body.slugs.some((slug) => typeof slug !== 'string' || slug.length > 160)) {
      return NextResponse.json({ error: 'Malformed availability request.' }, { status: 400 });
    }
    const items = await getAvailabilityForSlugs(body.slugs);
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=15' } });
  } catch {
    const items: InventoryAvailability[] = [];
    return NextResponse.json({ items, error: 'Availability temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
