"use client";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Accessible name, e.g. "Quantity for Greforce GR881W". */
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  label,
  size = "md",
  disabled = false,
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);

  const pad = size === "sm" ? "h-11 w-9" : "h-11 w-11";
  const field = size === "sm" ? "w-10 text-[15px]" : "w-12 text-[16px]";

  return (
    <div
      className="quantity-selector shrink-0 inline-flex items-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label}`}
        className={`${pad} grid place-items-center text-[18px] font-bold text-[var(--color-ink)] disabled:opacity-40`}
      >
        &minus;
      </button>
      <input
        type="number"
        inputMode="numeric"
        disabled={disabled}
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isNaN(n)) return;
          let next = n;
          if (next < min) next = min;
          if (max !== undefined && next > max) next = max;
          onChange(next);
        }}
        className={`${field} border-x border-[var(--color-border)] bg-transparent py-2 text-center font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label={`Increase ${label}`}
        className={`${pad} grid place-items-center text-[18px] font-bold text-[var(--color-ink)] disabled:opacity-40`}
      >
        +
      </button>
    </div>
  );
}
