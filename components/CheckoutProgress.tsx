const STEPS = ["Cart", "Delivery", "Payment", "Confirm"] as const;
export type CheckoutStepIndex = 0 | 1 | 2 | 3;

export function CheckoutProgress({ current }: { current: CheckoutStepIndex }) {
  return (
    <nav aria-label="Checkout progress" className="on-dark bg-[var(--color-green-dark)] text-white">
      <ol className="container-x flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
        {STEPS.map((label, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li
              key={label}
              className="checkout-step flex items-center gap-2"
              data-state={state}
              aria-current={state === "active" ? "step" : undefined}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span
                className={`checkout-step__marker grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${
                  state === "active"
                    ? "bg-[var(--color-red)] text-white"
                    : state === "done"
                      ? "bg-white/90 text-[var(--color-green-dark)]"
                      : "bg-white/15 text-white/70"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`text-[12px] font-bold uppercase tracking-wide ${
                  state === "todo" ? "text-white/55" : "text-white"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="checkout-step__line mx-1 h-px w-8 bg-white/25" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
