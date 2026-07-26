import {
  loanPayment,
  normalizeToMonthly,
  paymentsThroughHorizon,
  remainingBalanceAtHorizon,
  principalAndInterestThroughHorizon,
} from "./loan.js";

/**
 * Clamp retained-value percent to a sensible range.
 */
export function clampRetainedPercent(value, fallback = 50) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

/**
 * Fraction of value retained over one year starting at `ageYears`
 * (age of the vehicle at the beginning of that year).
 *
 * New cars take the steep year-0 hit; older used cars flatten.
 * Roughly aligned with industry TCO curves (AAA / Edmunds style),
 * without claiming model-specific Black Book forecasts.
 */
export function annualRetentionFactor(ageYears) {
  const age = Math.max(0, ageYears || 0);
  if (age < 1) return 0.8; // first year from new ~20% loss
  if (age < 3) return 0.85;
  if (age < 6) return 0.88;
  if (age < 10) return 0.9;
  return 0.92;
}

/**
 * Suggest retained % of today's asset value after `horizonMonths`,
 * given the vehicle's current age in years.
 *
 * Used cars already absorbed early depreciation in their purchase price,
 * so the same horizon retains a larger share of purchase/market value
 * than a new car would.
 */
export function suggestedRetainedPercent({
  vehicleAgeYears = 0,
  horizonMonths = 60,
  isUsed = false,
} = {}) {
  const startAge = isUsed ? Math.max(0, vehicleAgeYears || 0) : 0;
  const years = Math.max(1, Math.round((horizonMonths || 60) / 12));
  let factor = 1;
  for (let y = 0; y < years; y++) {
    factor *= annualRetentionFactor(startAge + y);
  }
  return clampRetainedPercent(Math.round(factor * 1000) / 10);
}

export function isUsedVehicleType(vehicleType) {
  return String(vehicleType || "").startsWith("used_");
}

/**
 * Terminal vehicle value from asset price and retained-value assumption.
 */
export function terminalVehicleValue(assetValue, retainedPercent) {
  const pct = clampRetainedPercent(retainedPercent) / 100;
  return Math.max(0, (assetValue || 0) * pct);
}

/**
 * Horizon TCO components shared by keep and swap paths.
 *
 * netHorizonCost = openingEquity + upfrontCash + loanPayments + operating − terminalEquity
 * economicMonthly = netHorizonCost / horizonMonths
 */
export function computeHorizonEconomics({
  horizonMonths,
  openingEquity,
  upfrontCash = 0,
  loanPrincipal,
  apr,
  termMonths,
  paymentFreq,
  operatingMonthly,
  assetValue,
  retainedPercent,
}) {
  const horizon = Math.max(1, horizonMonths || 60);
  const freq = paymentFreq || "monthly";
  const principal = Math.max(0, loanPrincipal || 0);
  const term = Math.max(1, termMonths || 60);

  const loanPaymentsTotal = paymentsThroughHorizon(
    principal,
    apr || 0,
    term,
    freq,
    horizon,
  );
  const { principalPaid, interestPaid } = principalAndInterestThroughHorizon(
    principal,
    apr || 0,
    term,
    freq,
    horizon,
  );
  const operatingTotal = Math.max(0, operatingMonthly || 0) * horizon;
  const terminalValue = terminalVehicleValue(assetValue, retainedPercent);
  const remainingBalance = remainingBalanceAtHorizon(
    principal,
    apr || 0,
    term,
    freq,
    horizon,
  );
  const terminalEquity = terminalValue - remainingBalance;
  const netHorizonCost =
    (openingEquity || 0) +
    (upfrontCash || 0) +
    loanPaymentsTotal +
    operatingTotal -
    terminalEquity;
  const economicMonthly = netHorizonCost / horizon;

  const scheduledPayment = loanPayment(principal, apr || 0, term, freq);
  const loanMonthly = normalizeToMonthly(scheduledPayment, freq);

  // Split scheduled cash loan payment into principal vs interest using the
  // amortization mix over the horizon (sums to loanMonthly for the cash chart).
  const paidMix = principalPaid + interestPaid;
  const principalMonthly =
    paidMix > 0 ? (principalPaid / paidMix) * loanMonthly : loanMonthly > 0 ? loanMonthly : 0;
  const interestMonthly = paidMix > 0 ? (interestPaid / paidMix) * loanMonthly : 0;

  return {
    horizonMonths: horizon,
    openingEquity: openingEquity || 0,
    upfrontCash: upfrontCash || 0,
    loanPaymentsTotal,
    principalPaid,
    interestPaid,
    operatingTotal,
    terminalVehicleValue: terminalValue,
    remainingLoanBalance: remainingBalance,
    terminalEquity,
    netHorizonCost,
    economicMonthly,
    loanMonthly,
    principalMonthly,
    interestMonthly,
    retainedPercent: clampRetainedPercent(retainedPercent),
  };
}
