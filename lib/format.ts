import { order } from "./config";

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: order.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** e.g. 319 -> "$319". Whole-dollar wholesale pricing. */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** e.g. 2792 -> "$2,792 AUD" for order totals. */
export function formatTotal(amount: number): string {
  return `${currencyFormatter.format(amount)} ${order.currency}`;
}

export function pluralTyres(n: number): string {
  return n === 1 ? "1 tyre" : `${n} tyres`;
}

/**
 * Single source of truth for the delivery-rule sentence rendered in the
 * header, footer, product cards and the free-delivery CTA. Every variant is
 * derived from `order.delivery` so the numbers cannot drift between surfaces.
 *
 * - `long`         — footer / full sentence
 * - `short`        — narrow mobile announcement bar
 * - `card`         — product-card footnote
 * - `announcement` — wide desktop announcement bar (uppercase)
 */
export function deliveryRuleSummary(
  variant: "long" | "short" | "card" | "announcement" = "long",
): string {
  const fee = formatCurrency(order.delivery.feeAud);
  const free = order.delivery.freeQualifyingTyres;
  const paidRange = `1–${free - 1}`;

  switch (variant) {
    case "short":
      return `${fee} delivery ${paidRange} · Free ${free}+`;
    case "card":
      return `${free}+ tyres ship free Adelaide-wide · ${fee} under ${free}`;
    case "announcement":
      return `NO MINIMUM ORDER · ${fee} DELIVERY (${paidRange} TYRES) · FREE DELIVERY ${free}+ TYRES`;
    default:
      return `${fee} delivery for ${paidRange} tyres · Free delivery from ${free} tyres`;
  }
}
