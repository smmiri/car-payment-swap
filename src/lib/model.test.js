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

  it("negative equity is not counted in cashToClose", () => {
    const inputs = baseInputs({
      current: { balance: 20_000 },
      scenarios: [
        createScenario({
          id: "neg",
          purchasePrice: 30_000,
          tradeInValue: 15_000,
          downPayment: 1_000,
        }),
      ],
    });
    const sim = simulateScenario(inputs, inputs.scenarios[0]);
    assert.equal(sim.cashToClose, 1_000);
  });
});

describe("economic monthly / terminal equity", () => {
  it("higher retained value lowers economic monthly for scenarios", () => {
    const inputs = baseInputs();
    const low = simulateScenario(
      inputs,
      createScenario({
        id: "low",
        retainedValuePercent: { mode: "manual", manual: 30 },
        purchasePrice: 28_000,
      }),
    );
    const high = simulateScenario(
      inputs,
      createScenario({
        id: "high",
        retainedValuePercent: { mode: "manual", manual: 70 },
        purchasePrice: 28_000,
      }),
    );
    assert.ok(high.economicMonthly < low.economicMonthly);
  });

  it("older used car has higher auto retained % than new", () => {
    const inputs = baseInputs({ global: { ownershipHorizonMonths: 60 } });
    const used = simulateScenario(
      inputs,
      createScenario({
        id: "used",
        vehicleType: "used_gas",
        vehicleAgeYears: 6,
        purchasePrice: 28_000,
        retainedValuePercent: { mode: "auto", manual: 50 },
      }),
    );
    const neu = simulateScenario(
      inputs,
      createScenario({
        id: "new",
        vehicleType: "new_gas",
        vehicleAgeYears: 0,
        purchasePrice: 28_000,
        retainedValuePercent: { mode: "auto", manual: 50 },
      }),
    );
    assert.ok(used.retainedPercent > neu.retainedPercent);
  });

  it("cashAllInMonthly remains payment plus operating", () => {
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
    assert.equal(cur.cashAllInMonthly, 800);
    assert.ok(typeof cur.economicMonthly === "number");
  });

  it("opening equity differs for keep vs swap paths", () => {
    const inputs = baseInputs({
      current: { balance: 18_000, marketValue: 20_000 },
    });
    const keep = simulateCurrent(inputs);
    const swap = simulateScenario(
      inputs,
      createScenario({ tradeInValue: 16_000, purchasePrice: 28_000 }),
    );
    assert.equal(keep.horizonBreakdown?.openingEquity ?? keep.openingEquity, 2_000);
    assert.equal(swap.horizonBreakdown.openingEquity, -2_000);
  });

  it("partial horizon remaining debt reduces terminal equity", () => {
    const inputs = baseInputs({
      global: { ownershipHorizonMonths: 24 },
      scenarios: [
        createScenario({
          id: "short",
          purchasePrice: 28_000,
          termMonths: 60,
          retainedValuePercent: { mode: "manual", manual: 50 },
        }),
      ],
    });
    const sim = simulateScenario(inputs, inputs.scenarios[0]);
    assert.ok(sim.remainingLoanBalance > 0);
    assert.ok(sim.terminalEquity < sim.terminalVehicleValue);
  });
});

describe("solveMaxBudget", () => {
  it("finds a purchase price at or under the economic target", () => {
    const inputs = baseInputs({
      global: { targetEconomicMonthly: 900, province: "ON", ownershipHorizonMonths: 60 },
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
      retainedValuePercent: { mode: "manual", manual: 50 },
    });
    const result = solveMaxBudget(inputs, sc);
    assert.equal(result.feasible, true);
    assert.ok(result.maxPurchasePrice > 0);
    assert.ok(result.impliedEconomicMonthly <= inputs.global.targetEconomicMonthly + 1);
  });

  it("higher retained value raises the auto-solved purchase price", () => {
    const mk = (retained) =>
      createScenario({
        id: `s_${retained}`,
        priceMode: "solved",
        tradeInValue: 16_000,
        insurance: { mode: "manual", manual: 150 },
        mo: { mode: "manual", manual: 100 },
        fuel: { mode: "manual", manual: 100 },
        retainedValuePercent: { mode: "manual", manual: retained },
      });
    const inputs = baseInputs({
      global: { targetEconomicMonthly: 850, province: "ON" },
    });
    const low = resolveEffectiveScenario(inputs, mk(30)).purchasePrice;
    const high = resolveEffectiveScenario(inputs, mk(70)).purchasePrice;
    assert.ok(high > low);
  });
});

describe("compareScenarios", () => {
  it("three trade-in levels show monotonic improvement in economic cost", () => {
    const inputs = baseInputs({
      scenarios: [
        createScenario({ id: "a", name: "Low", tradeInValue: 14_000, purchasePrice: 28_000 }),
        createScenario({ id: "b", name: "Mid", tradeInValue: 16_000, purchasePrice: 28_000 }),
        createScenario({ id: "c", name: "High", tradeInValue: 18_000, purchasePrice: 28_000 }),
      ],
    });
    const cmp = compareScenarios(inputs);
    assert.ok(cmp.scenarios[0].economicMonthly >= cmp.scenarios[1].economicMonthly - 0.01);
    assert.ok(cmp.scenarios[1].economicMonthly >= cmp.scenarios[2].economicMonthly - 0.01);
    assert.ok(cmp.best);
    assert.ok(cmp.current.economicMonthly !== 0);
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
    const inputs = baseInputs({ global: { targetEconomicMonthly: 850, province: "ON" } });
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
    assert.ok(sim.economicMonthly <= inputs.global.targetEconomicMonthly + 1);
  });
});
