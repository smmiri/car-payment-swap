import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loanPayment,
  invertLoanPayment,
  normalizeToMonthly,
  periodRate,
  totalInterest,
  periodsAtHorizon,
  remainingBalanceAfterPeriods,
  paymentsThroughHorizon,
  remainingBalanceAtHorizon,
} from "./loan.js";

describe("loan (monthly compounding)", () => {
  it("uses APR/12 period rate, not Canadian semi-annual", () => {
    const r = periodRate(12, "monthly");
    assert.equal(r, 0.01);
    assert.notEqual(Number(r.toFixed(6)), 0.009759);
  });

  it("computes standard amortizing payment", () => {
    const pmt = loanPayment(20_000, 6, 60, "monthly");
    assert.ok(pmt > 380 && pmt < 390);
  });

  it("invertLoanPayment round-trips", () => {
    const principal = 25_000;
    const pmt = loanPayment(principal, 7.9, 72, "monthly");
    const back = invertLoanPayment(pmt, 7.9, 72, "monthly");
    assert.ok(Math.abs(back - principal) < 0.5);
  });

  it("normalizes biweekly to monthly", () => {
    assert.equal(normalizeToMonthly(200, "biweekly"), (200 * 26) / 12);
  });

  it("total interest is non-negative", () => {
    assert.ok(totalInterest(15_000, 8, 48, "monthly") > 0);
    assert.equal(totalInterest(0, 8, 48, "monthly"), 0);
  });
});

describe("loan horizon amortization", () => {
  it("periodsAtHorizon converts months to payment periods", () => {
    assert.equal(periodsAtHorizon(60, "monthly"), 60);
    assert.equal(periodsAtHorizon(60, "biweekly"), 130);
    assert.equal(periodsAtHorizon(60, "weekly"), 260);
  });

  it("zero-interest remaining balance declines linearly", () => {
    const bal = remainingBalanceAfterPeriods(12_000, 200, 0, 24, 60);
    assert.equal(bal, 12_000 - 200 * 24);
  });

  it("paymentsThroughHorizon caps at loan payoff", () => {
    const principal = 10_000;
    const pmt = loanPayment(principal, 6, 36, "monthly");
    const full = pmt * 36;
    const atHorizon = paymentsThroughHorizon(principal, 6, 36, "monthly", 60);
    assert.ok(Math.abs(atHorizon - full) < 0.01);
  });

  it("remainingBalanceAtHorizon is zero when loan paid off before horizon", () => {
    const bal = remainingBalanceAtHorizon(10_000, 6, 36, "monthly", 60);
    assert.equal(bal, 0);
  });

  it("partial horizon leaves positive balance", () => {
    const bal = remainingBalanceAtHorizon(20_000, 6, 60, "monthly", 36);
    assert.ok(bal > 0);
    assert.ok(bal < 20_000);
  });

  it("supports weekly frequency", () => {
    const paid = paymentsThroughHorizon(15_000, 7, 48, "weekly", 24);
    assert.ok(paid > 0);
    const bal = remainingBalanceAtHorizon(15_000, 7, 48, "weekly", 24);
    assert.ok(bal >= 0);
  });
});
