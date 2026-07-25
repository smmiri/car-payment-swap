const formatterCache = new Map();

function getFormatters() {
  if (formatterCache.has("en")) return formatterCache.get("en");

  const formatters = {
    currency: new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }),
    currencyDecimal: new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 2,
    }),
    compact: new Intl.NumberFormat("en-CA", {
      notation: "compact",
      maximumFractionDigits: 1,
    }),
  };
  formatterCache.set("en", formatters);
  return formatters;
}

export function formatCurrency(n) {
  if (!Number.isFinite(n)) return "n/a";
  return getFormatters().currency.format(Math.round(n));
}

export function formatCurrencyDecimal(n) {
  if (!Number.isFinite(n)) return "n/a";
  return getFormatters().currencyDecimal.format(n);
}

export function formatCompactCurrency(n) {
  if (!Number.isFinite(n)) return "n/a";
  const f = getFormatters();
  const sign = n < 0 ? "-" : "";
  const compact = f.compact.format(Math.abs(n));
  return `${sign}$${compact}`;
}

export function formatSignedCurrency(n) {
  if (!Number.isFinite(n)) return "n/a";
  const f = getFormatters();
  const abs = Math.abs(Math.round(n));
  const sign = n >= 0 ? "+" : "−";
  const formatted = f.currency.format(abs);
  return `${sign}${formatted.replace(/^[-−]?/, "")}`;
}

export function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}
