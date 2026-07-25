import {
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyDecimal,
  formatPercent,
  formatSignedCurrency,
} from "../lib/format.js";

/** English-only formatters (en-CA). */
export function useFormat() {
  return {
    formatCurrency,
    formatCurrencyDecimal,
    formatCompactCurrency,
    formatSignedCurrency,
    formatPercent,
  };
}
