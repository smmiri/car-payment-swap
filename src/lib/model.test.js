import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INPUTS, createScenario } from "./defaults.js";
import {
  simulateScenario,
  compareScenarios,
  solveMaxBudget,
  simulateCurrent,
  tradeEquity,
  resolveEffectiveScenario,
} from "./model.js";
import { computeVehicleTaxes } from "./vehicle-taxes.js";

function baseInputs(patch = {}) {
  const inputs = structuredClone(DEFAULT_INPUTS);
  Object.assign(inputs.global, patch.global || {});
  Object.assign(inputs.current, patch.current || {});
  if (patch.scenarios) inputs.scenarios = patch.scenarios;
  return inputs;
}

describe("trade equity", () => {
  it("negative equity rolls into financed amount", () => {
    assert.equal(tradeEquity(15_000, 20_000), -5_000);
    const inputs = baseInputs({
      current: { balance: 20_000 },
      scenarios: [
        createScenario({
          id: "neg",
          purchasePrice: 30_000,
          tradeInValue: 15_000,
          downPayment: 0,
          vehicleType: "used_gas",
          channel: "dealer",
        }),
      ],
    });
    const sim = simulateScenario(inputs, inputs.scenarios[0]);
    assert.ok(sim.tradeEquity < 0);
    assert.ok(sim.warnings.some((w) => w.code === "NEGATIVE_EQUITY"));
    assert.ok(sim.amountFinanced > 30_000);
  });
});

describe("solveMaxBudget", () => {
  it("target $900 all-in with $350 ops → $550 loan room", () => {
    const inputs = baseInputs({
      global: { targetAllInMonthly: 900, province: "ON" },
    });
    const sc = createScenario({
      id: "budget",
      vehicleType: "used_gas",
      tradeInValue: 16_000,
      downPayment: 2_000,
      apr: 6.9,
      termMonths: 60,
      insurance: { mode: "manual", manual: 150 },
      mo: { mode: "manual", manual: 100 },
      fuel: { mode: "manual", manual: 100 },
    });
    const result = solveMaxBudget(inputs, sc);
    assert.equal(result.feasible, true);
    assert.ok(Math.abs(result.operatingMonthly - 350) < 0.01);
    assert.ok(Math.abs(result.maxLoanPaymentMonthly - 550) < 0.01);
    assert.ok(result.maxPurchasePrice > 0);
  });
});

describe("compareScenarios", () => {
  it("three trade-in levels show monotonic improvement", () => {
    const inputs = baseInputs({
      scenarios: [
        createScenario({ id: "a", name: "Low", tradeInValue: 14_000, purchasePrice: 28_000 }),
        createScenario({ id: "b", name: "Mid", tradeInValue: 16_000, purchasePrice: 28_000 }),
        createScenario({ id: "c", name: "High", tradeInValue: 18_000, purchasePrice: 28_000 }),
      ],
    });
    const cmp = compareScenarios(inputs);
    assert.ok(cmp.scenarios[0].allInMonthly >= cmp.scenarios[1].allInMonthly - 0.01);
    assert.ok(cmp.scenarios[1].allInMonthly >= cmp.scenarios[2].allInMonthly - 0.01);
    assert.ok(cmp.best);
    assert.ok(cmp.current.allInMonthly > 0);
  });
});

describe("BC tax integration in simulate", () => {
  it("matches PST-116 example inside scenario", () => {
    const t = computeVehicleTaxes({
      province: "BC",
      purchasePrice: 60_000,
      tradeInValue: 25_000,
      channel: "dealer",
      vehicleType: "new_gas",
    });
    assert.equal(t.pst, 3_500);

    const inputs = baseInputs({
      global: { province: "BC" },
      current: { balance: 25_000 },
      scenarios: [
        createScenario({
          id: "bc",
          purchasePrice: 60_000,
          tradeInValue: 25_000,
          dealerFees: { mode: "manual", manual: 0 },
          vehicleType: "new_gas",
          channel: "dealer",
        }),
      ],
    });
    const sim = simulateScenario(inputs, inputs.scenarios[0]);
    assert.equal(sim.taxBreakdown.pst, 3_500);
  });
});

describe("createScenario id handling", () => {
  it("generates a unique id even when overrides pass id: undefined", () => {
    const a = createScenario({ id: undefined, name: "A" });
    const b = createScenario({ id: undefined, name: "B" });
    assert.ok(typeof a.id === "string" && a.id.length > 0);
    assert.ok(typeof b.id === "string" && b.id.length > 0);
    assert.notEqual(a.id, b.id);
  });

  it("honors an explicit truthy id override", () => {
    assert.equal(createScenario({ id: "sc_keep" }).id, "sc_keep");
  });
});

describe("auto max budget (priceMode solved)", () => {
  it("effective purchase price tracks the solved max budget", () => {
    const inputs = baseInputs({ global: { targetAllInMonthly: 900, province: "ON" } });
    const sc = createScenario({
      id: "solved",
      priceMode: "solved",
      tradeInValue: 16_000,
      downPayment: 2_000,
      insurance: { mode: "manual", manual: 150 },
      mo: { mode: "manual", manual: 100 },
      fuel: { mode: "manual", manual: 100 },
    });
    const mb = solveMaxBudget(inputs, sc);
    const effective = resolveEffectiveScenario(inputs, sc);
    assert.equal(effective.purchasePrice, mb.maxPurchasePrice);

    const sim = simulateScenario(inputs, effective);
    // Implied all-in should be at (not over) the target.
    assert.ok(sim.allInMonthly <= inputs.global.targetAllInMonthly + 1);
  });

  it("higher trade-in raises the auto-solved purchase price", () => {
    const mk = (tradeIn) =>
      createScenario({
        id: `s_${tradeIn}`,
        priceMode: "solved",
        tradeInValue: tradeIn,
        insurance: { mode: "manual", manual: 150 },
        mo: { mode: "manual", manual: 100 },
        fuel: { mode: "manual", manual: 100 },
      });
    const inputs = baseInputs({ global: { targetAllInMonthly: 900, province: "ON" } });
    const low = resolveEffectiveScenario(inputs, mk(10_000)).purchasePrice;
    const high = resolveEffectiveScenario(inputs, mk(20_000)).purchasePrice;
    assert.ok(high > low);
  });
});

describe("simulateCurrent", () => {
  it("sums normalized payment + ops", () => {
    const inputs = baseInputs({
      current: {
        payment: 500,
        freq: "monthly",
        insurance: { mode: "manual", manual: 100 },
        mo: { mode: "manual", manual: 50 },
        fuel: { mode: "manual", manual: 150 },
      },
    });
    const cur = simulateCurrent(inputs);
    assert.equal(cur.allInMonthly, 800);
  });
});
