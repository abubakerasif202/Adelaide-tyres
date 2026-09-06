import { order } from "@/lib/config";
import { formatCurrency, pluralTyres } from "@/lib/format";

export function DeliveryStatus({
  totalTyres,
  qualifiesForFreeDelivery,
  deliveryFee,
}: {
  totalTyres: number;
  qualifiesForFreeDelivery: boolean;
  deliveryFee: number;
}) {
  if (qualifiesForFreeDelivery) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-green)] px-5 py-4 text-white">
        <p className="font-bold uppercase tracking-wide text-[14px]">
          ✓ Free Adelaide-wide delivery · {pluralTyres(totalTyres)} in cart
        </p>
        <p className="mt-1 text-[13px] text-white/80">
          No minimum order — free delivery unlocked at {order.delivery.freeQualifyingTyres}+ tyres
        </p>
      </div>
    );
  }
  const tyresToFreeDelivery = order.delivery.freeQualifyingTyres - totalTyres;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4">
      <p className="font-bold text-[var(--color-text)]">
        {formatCurrency(deliveryFee)} Adelaide-wide delivery · {pluralTyres(totalTyres)} in cart
      </p>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        No minimum order. Add {pluralTyres(tyresToFreeDelivery)} more to unlock free delivery, or
        choose warehouse pickup for free.
      </p>
    </div>
  );
}
