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
