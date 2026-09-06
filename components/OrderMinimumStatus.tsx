import { order } from "@/lib/config";

export function OrderMinimumStatus({
  totalTyres,
  minimumMet,
  tyresRemaining,
}: {
  totalTyres: number;
  minimumMet: boolean;
  tyresRemaining: number;
}) {
  if (minimumMet) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-green)] px-5 py-4 text-white">
        <p className="font-bold uppercase tracking-wide text-[14px]">
          ✓ Minimum order met · {totalTyres} tyres in cart
        </p>
        <p className="mt-1 text-[13px] text-white/80">
          ✓ Free Adelaide-wide delivery included
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-red)] bg-[#fff2f2] px-5 py-4">
      <p className="font-bold text-[var(--color-red-deep)]">
        Add {tyresRemaining} more {tyresRemaining === 1 ? "tyre" : "tyres"} to qualify
        for checkout and free Adelaide-wide delivery.
      </p>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        The order minimum is {order.minimumTyres} tyres total. Mix any products.
      </p>
    </div>
  );
}
