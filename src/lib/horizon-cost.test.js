import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampRetainedPercent,
  terminalVehicleValue,
  computeHorizonEconomics,
  suggestedRetainedPercent,
} from "./horizon-cost.js";

describe("horizon-cost", () => {
  it("terminalVehicleValue applies retained percent", () => {
    assert.equal(terminalVehicleValue(40_000, 50), 20_000);
    assert.equal(terminalVehicleValue(40_000, 0), 0);
  });

  it("clampRetainedPercent bounds invalid input", () => {
    assert.equal(clampRetainedPercent(-5), 0);
    assert.equal(clampRetainedPercent(150), 100);
    assert.equal(clampRetainedPercent(undefined, 50), 50);
  });

  it("used cars retain more of purchase price than new over the same horizon", () => {
    const horizonMonths = 60;
    const newPct = suggestedRetainedPercent({
      vehicleAgeYears: 0,
      horizonMonths,
      isUsed: false,
    });
    const usedPct = suggestedRetainedPercent({
      vehicleAgeYears: 5,
      horizonMonths,
      isUsed: true,
    });
    assert.ok(usedPct > newPct);
  });

  it("older used cars retain more than younger used cars", () => {
    const young = suggestedRetainedPercent({
      vehicleAgeYears: 2,
      horizonMonths: 60,
      isUsed: true,
    });
    const older = suggestedRetainedPercent({
      vehicleAgeYears: 8,
      horizonMonths: 60,
      isUsed: true,
    });
    assert.ok(older > young);
  });

  it("higher retained value lowers economic monthly", () => {
    const base = {
      horizonMonths: 60,
      openingEquity: 2_000,
      upfrontCash: 2_000,
      loanPrincipal: 25_000,
      apr: 6.9,
      termMonths: 60,
      paymentFreq: "monthly",
      operatingMonthly: 350,
      assetValue: 28_000,
    };
    const low = computeHorizonEconomics({ ...base, retainedPercent: 30 });
    const high = computeHorizonEconomics({ ...base, retainedPercent: 60 });
    assert.ok(high.economicMonthly < low.economicMonthly);
    assert.ok(high.terminalEquity > low.terminalEquity);
  });

  it("net horizon cost equals components", () => {
    const h = computeHorizonEconomics({
      horizonMonths: 36,
      openingEquity: 1_000,
      upfrontCash: 500,
      loanPrincipal: 18_000,
      apr: 5.9,
      termMonths: 60,
      paymentFreq: "monthly",
      operatingMonthly: 480,
      assetValue: 20_000,
      retainedPercent: 50,
    });
    const recomputed =
      h.openingEquity +
      h.upfrontCash +
      h.loanPaymentsTotal +
      h.operatingTotal -
      h.terminalEquity;
    assert.ok(Math.abs(recomputed - h.netHorizonCost) < 0.01);
    assert.ok(Math.abs(h.economicMonthly - h.netHorizonCost / 36) < 0.01);
  });
});
