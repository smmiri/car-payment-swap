/** Payment frequencies used across current car and scenarios. */
export const FREQUENCIES = {
  monthly: { periodsPerYear: 12, label: "Monthly" },
  biweekly: { periodsPerYear: 26, label: "Bi-weekly" },
  weekly: { periodsPerYear: 52, label: "Weekly" },
};

export function periodsPerYear(freq = "monthly") {
  return FREQUENCIES[freq]?.periodsPerYear ?? 12;
}

/**
 * Auto loans use monthly compounding (unlike Canadian mortgages).
 * Period rate = APR / 100 / periods_per_year.
 */
export function periodRate(aprPct, freq = "monthly") {
  if (!(aprPct > 0)) return 0;
  return aprPct / 100 / periodsPerYear(freq);
}

/**
 * Standard amortizing payment for a period rate and n periods.
 */
export function paymentAmount(principal, rate, n) {
  if (!(principal > 0) || !(n > 0)) return 0;
  if (!(rate > 0)) return principal / n;
  const factor = Math.pow(1 + rate, n);
  return (principal * rate * factor) / (factor - 1);
}

/**
 * Loan payment at the chosen frequency (auto loan monthly compounding).
 */
export function loanPayment(principal, aprPct, termMonths, freq = "monthly") {
  const ppy = periodsPerYear(freq);
  const n = Math.round((termMonths / 12) * ppy);
  const r = periodRate(aprPct, freq);
  return paymentAmount(principal, r, n);
}

/**
 * Convert a payment at `freq` into an equivalent monthly amount.
 * monthly = payment * periods_per_year / 12
 */
export function normalizeToMonthly(payment, freq = "monthly") {
  if (!Number.isFinite(payment)) return 0;
  return (payment * periodsPerYear(freq)) / 12;
}

/**
 * Convert a monthly amount into a payment at `freq`.
 */
export function monthlyToFrequency(monthly, freq = "monthly") {
  if (!Number.isFinite(monthly)) return 0;
  return (monthly * 12) / periodsPerYear(freq);
}

/**
 * Invert an amortizing payment to principal (amount financed).
 */
export function invertPayment(payment, rate, n) {
  if (!(payment > 0) || !(n > 0)) return 0;
  if (!(rate > 0)) return payment * n;
  const factor = Math.pow(1 + rate, n);
  return (payment * (factor - 1)) / (rate * factor);
}

/**
 * Max amount financed given a payment at the chosen frequency.
 */
export function invertLoanPayment(payment, aprPct, termMonths, freq = "monthly") {
  const ppy = periodsPerYear(freq);
  const n = Math.round((termMonths / 12) * ppy);
  const r = periodRate(aprPct, freq);
  return invertPayment(payment, r, n);
}

/**
 * Total interest over the full amortization schedule.
 */
export function totalInterest(principal, aprPct, termMonths, freq = "monthly") {
  const ppy = periodsPerYear(freq);
  const n = Math.round((termMonths / 12) * ppy);
  const payment = loanPayment(principal, aprPct, termMonths, freq);
  return Math.max(0, payment * n - principal);
}

/**
 * Payment periods elapsed over an ownership horizon.
 */
export function periodsAtHorizon(horizonMonths, freq = "monthly") {
  const ppy = periodsPerYear(freq);
  return Math.max(0, Math.round((horizonMonths / 12) * ppy));
}

/**
 * Remaining principal after `periodsPaid` amortizing payments.
 */
export function remainingBalanceAfterPeriods(
  principal,
  payment,
  rate,
  periodsPaid,
  totalPeriods,
) {
  if (!(principal > 0)) return 0;
  const paid = Math.max(0, Math.min(periodsPaid, totalPeriods));
  if (paid <= 0) return principal;
  if (paid >= totalPeriods) return 0;
  if (!(rate > 0)) return Math.max(0, principal - payment * paid);
  const factor = Math.pow(1 + rate, paid);
  return Math.max(0, principal * factor - (payment * (factor - 1)) / rate);
}

/**
 * Total loan payments made through the horizon (stops when the loan is paid off).
 */
export function paymentsThroughHorizon(
  principal,
  aprPct,
  termMonths,
  freq,
  horizonMonths,
) {
  if (!(principal > 0) || !(horizonMonths > 0)) return 0;
  const ppy = periodsPerYear(freq);
  const totalPeriods = Math.round((termMonths / 12) * ppy);
  const horizonPeriods = periodsAtHorizon(horizonMonths, freq);
  const periodsPaid = Math.min(horizonPeriods, totalPeriods);
  const payment = loanPayment(principal, aprPct, termMonths, freq);
  return payment * periodsPaid;
}

/**
 * Remaining loan balance at the ownership horizon.
 */
export function remainingBalanceAtHorizon(
  principal,
  aprPct,
  termMonths,
  freq,
  horizonMonths,
) {
  if (!(principal > 0)) return 0;
  const ppy = periodsPerYear(freq);
  const totalPeriods = Math.round((termMonths / 12) * ppy);
  const horizonPeriods = periodsAtHorizon(horizonMonths, freq);
  const periodsPaid = Math.min(horizonPeriods, totalPeriods);
  const rate = periodRate(aprPct, freq);
  const payment = loanPayment(principal, aprPct, termMonths, freq);
  return remainingBalanceAfterPeriods(
    principal,
    payment,
    rate,
    periodsPaid,
    totalPeriods,
  );
}

/**
 * Principal and interest paid through the ownership horizon.
 * principalPaid + interestPaid === paymentsThroughHorizon(...).
 */
export function principalAndInterestThroughHorizon(
  principal,
  aprPct,
  termMonths,
  freq,
  horizonMonths,
) {
  const paymentsTotal = paymentsThroughHorizon(
    principal,
    aprPct,
    termMonths,
    freq,
    horizonMonths,
  );
  if (!(principal > 0) || paymentsTotal <= 0) {
    return { paymentsTotal: 0, principalPaid: 0, interestPaid: 0 };
  }
  const remaining = remainingBalanceAtHorizon(
    principal,
    aprPct,
    termMonths,
    freq,
    horizonMonths,
  );
  const principalPaid = Math.max(0, Math.min(principal, principal - remaining));
  const interestPaid = Math.max(0, paymentsTotal - principalPaid);
  return { paymentsTotal, principalPaid, interestPaid };
}
