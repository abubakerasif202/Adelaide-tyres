"use client";

import { useLineQuantityCap } from "@/lib/inventory/availability-context";
import { QuantitySelector } from "./QuantitySelector";

/**
 * Cart/checkout quantity control capped by live 247 availability. The cap is a
 * courtesy for the customer; 247 remains the authority at reservation time.
 */
export function LineQuantitySelector({ slug, value, onChange, label }: { slug: string; value: number; onChange: (quantity: number) => void; label: string }) {
  const max = useLineQuantityCap(slug);
  return <QuantitySelector value={value} onChange={onChange} min={1} max={max} label={label} size="sm" />;
}
