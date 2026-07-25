import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loanPayment,
  invertLoanPayment,
  normalizeToMonthly,
  periodRate,
  totalInterest,
} from "./loan.js";

describe("loan (monthly compounding)", () => {
  it("uses APR/12 period rate, not Canadian semi-annual", () => {
    const r = periodRate(12, "monthly");
    assert.equal(r, 0.01);
    // Canadian mortgage semi-annual would be (1+0.12/2)^(1/6)-1 ≈ 0.0097588
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
