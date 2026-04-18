export const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const compactCurrencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const percentFormatter = new Intl.NumberFormat("en-SG", {
  maximumFractionDigits: 0,
});

export const dateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatDays(value: number) {
  return `${value} day${value === 1 ? "" : "s"}`;
}

export function formatDelta(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${currencyFormatter.format(value)}`;
}
