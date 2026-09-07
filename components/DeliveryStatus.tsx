import { order } from "@/lib/config";
import { formatCurrency, pluralTyres } from "@/lib/format";

export function DeliveryStatus({ totalTyres, qualifiesForFreeDelivery, deliveryFee }: {
  totalTyres: number;
  qualifiesForFreeDelivery: boolean;
  deliveryFee: number;
}) {
  const target = order.delivery.freeQualifyingTyres;
  const progress = Math.min(totalTyres, target);
  return (
    <div className={`delivery-status rounded-[var(--radius-md)] border px-5 py-4 ${qualifiesForFreeDelivery ? "is-qualified border-[var(--color-green)] bg-[var(--color-green)] text-white" : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"}`}>
      <div aria-live="polite" aria-atomic="true">
        <p className="font-bold text-[14px]">
          {qualifiesForFreeDelivery ? "✓ FREE ADELAIDE-WIDE DELIVERY UNLOCKED" : `${formatCurrency(deliveryFee)} Adelaide-wide delivery · ${pluralTyres(totalTyres)} in cart`}
        </p>
        <p className={`mt-1 text-[13px] ${qualifiesForFreeDelivery ? "text-white/80" : "text-[var(--color-text-muted)]"}`}>
          {qualifiesForFreeDelivery ? `${pluralTyres(totalTyres)} in cart · No minimum order` : `No minimum order. Add ${pluralTyres(target - totalTyres)} more to unlock free Adelaide-wide delivery, or choose warehouse pickup for free.`}
        </p>
      </div>
      <div className="mt-3" role="progressbar" aria-label="Tyres towards free Adelaide-wide delivery" aria-valuemin={0} aria-valuemax={target} aria-valuenow={progress} aria-valuetext={qualifiesForFreeDelivery ? "Free Adelaide-wide delivery unlocked" : `${totalTyres} of ${target} tyres for free delivery. No minimum order.`}>
        <div className={`h-1.5 overflow-hidden rounded-full ${qualifiesForFreeDelivery ? "bg-white/25" : "bg-[var(--color-border)]"}`}>
          <div className={`delivery-progress__fill h-full w-full origin-left rounded-full ${qualifiesForFreeDelivery ? "bg-white" : "bg-[var(--color-green)]"}`} style={{ transform: `scaleX(${progress / target})` }} />
        </div>
        {!qualifiesForFreeDelivery && <p className="mt-1.5 text-[12px] font-semibold text-[var(--color-green)]">{totalTyres} / {target} tyres for free delivery</p>}
      </div>
    </div>
  );
}
