/**
 * SwapMyCar financial model.
 *
 * Decision metric: cashAllInMonthly = loan payment + insurance + M&O + fuel/elec
 *   (per-scenario targetCashAllInMonthly drives vs-target and max-budget solve).
 * Informational: economicMonthly = net horizon TCO / ownershipHorizonMonths
 *   (exit equity / depreciation context — not used as the cash target).
 * Auto loans: monthly compounding (see loan.js) — not Canadian mortgage semi-annual.
 */

import {
  invertLoanPayment,
  loanPayment,
  normalizeToMonthly,
  totalInterest,
} from "./loan.js";
import { resolveFieldValue, anyManualOverride } from "./overrides.js";
import {
  computeVehicleTaxes,
  defaultLicensing,
  BC_PST_TIER_BOUNDARIES,
} from "./vehicle-taxes.js";
import { computeEvIncentives } from "./ev-incentives.js";
import {
  defaultOperatingCosts,
  sumOperatingMonthly,
} from "./operating-costs.js";
import {
  computeHorizonEconomics,
  terminalVehicleValue,
  suggestedRetainedPercent,
  isUsedVehicleType,
} from "./horizon-cost.js";
import { warn, info, error } from "./warning-codes.js";

function fieldMode(field) {
  if (field && typeof field === "object" && "mode" in field) return field;
  if (typeof field === "number" && Number.isFinite(field)) {
    return { mode: "manual", manual: field };
  }
  return { mode: "auto", manual: field ?? 0 };
}

export function resolveRetainedPercent({
  retainedField,
  vehicleAgeYears = 0,
  horizonMonths = 60,
  isUsed = false,
}) {
  const suggested = suggestedRetainedPercent({
    vehicleAgeYears,
    horizonMonths,
    isUsed,
  });
  return resolveFieldValue({
    mode: fieldMode(retainedField).mode,
    manual: fieldMode(retainedField).manual,
    computed: suggested,
  });
}

/** Per-scenario cash budget target (loan + ops). */
export function scenarioCashTarget(scenario) {
  if (typeof scenario?.targetCashAllInMonthly === "number") {
    return Math.max(0, scenario.targetCashAllInMonthly);
  }
  return 800;
}

/** Per-scenario ownership horizon for informational TCO. */
export function scenarioHorizonMonths(scenario) {
  return Math.max(1, scenario?.ownershipHorizonMonths || 60);
}

function activeScenario(inputs) {
  const list = inputs?.scenarios || [];
  return list.find((s) => s.id === inputs.activeScenarioId) || list[0] || null;
}

/** Legacy global target readers — prefer scenario fields. */
export function targetEconomicMonthly(global) {
  if (!global) return 0;
  if (typeof global.targetEconomicMonthly === "number") {
    return global.targetEconomicMonthly;
  }
  return global.targetAllInMonthly || 0;
}

export function ownershipHorizonMonths(globalOrScenario) {
  return Math.max(1, globalOrScenario?.ownershipHorizonMonths || 60);
}

export function tradeEquity(tradeInValue, remainingBalance) {
  return (tradeInValue || 0) - (remainingBalance || 0);
}

function attachHorizonMetrics(base, horizon) {
  return {
    ...base,
    ...horizon,
    cashAllInMonthly: base.cashAllInMonthly,
    economicMonthly: horizon.economicMonthly,
    vsTarget: base.cashAllInMonthly - base.target,
  };
}

/**
 * Baseline: keep current car.
 */
export function simulateCurrent(inputs) {
  const { current: c } = inputs;
  const active = activeScenario(inputs);
  const target = scenarioCashTarget(active);
  const horizonMonths = scenarioHorizonMonths(active);
  const balance = Math.max(0, c.balance || 0);
  const marketValue = Math.max(0, c.marketValue ?? 0);
  const vehicleAgeYears = Math.max(0, c.vehicleAgeYears ?? 0);
  const retainedResolved = resolveRetainedPercent({
    retainedField: c.retainedValuePercent,
    vehicleAgeYears,
    horizonMonths,
    isUsed: true,
  });
  const retainedPercent = retainedResolved.value;

  const insurance = resolveFieldValue({
    mode: fieldMode(c.insurance).mode,
    manual: fieldMode(c.insurance).manual,
    computed: fieldMode(c.insurance).manual || 0,
  });
  const mo = resolveFieldValue({
    mode: fieldMode(c.mo).mode,
    manual: fieldMode(c.mo).manual,
    computed: fieldMode(c.mo).manual || 0,
  });
  const fuel = resolveFieldValue({
    mode: fieldMode(c.fuel).mode,
    manual: fieldMode(c.fuel).manual,
    computed: fieldMode(c.fuel).manual || 0,
  });

  const loanMonthly = normalizeToMonthly(c.payment || 0, c.freq || "monthly");
  const operatingMonthly = sumOperatingMonthly({
    insurance: insurance.value,
    mo: mo.value,
    fuel: fuel.value,
  });
  const cashAllInMonthly = loanMonthly + operatingMonthly;

  const openingEquity = marketValue - balance;
  const horizon = computeHorizonEconomics({
    horizonMonths,
    openingEquity,
    upfrontCash: 0,
    loanPrincipal: balance,
    apr: c.apr || 0,
    termMonths: c.remainingTermMonths || 60,
    paymentFreq: c.freq || "monthly",
    operatingMonthly,
    assetValue: marketValue,
    retainedPercent,
  });

  return attachHorizonMetrics(
    {
      loanMonthly,
      insurance: insurance.value,
      mo: mo.value,
      fuel: fuel.value,
      operatingMonthly,
      cashAllInMonthly,
      marketValue,
      vehicleAgeYears,
      retainedPercent: horizon.retainedPercent,
      retainedSuggested: suggestedRetainedPercent({
        vehicleAgeYears,
        horizonMonths,
        isUsed: true,
      }),
      balance,
      target,
    },
    horizon,
  );
}

/**
 * Full simulation for one replacement scenario.
 */
export function simulateScenario(inputs, scenario) {
  const g = inputs.global;
  const current = inputs.current;
  const sc = scenario;
  const warnings = [];
  const target = scenarioCashTarget(sc);
  const horizonMonths = scenarioHorizonMonths(sc);

  const dealerFeesResolved = resolveFieldValue({
    mode: fieldMode(sc.dealerFees).mode,
    manual: fieldMode(sc.dealerFees).manual,
    computed: 499,
  });
  const purchasePrice = Math.max(0, (sc.purchasePrice || 0) + (dealerFeesResolved.value || 0));
  const stickerPrice = Math.max(0, sc.purchasePrice || 0);
  const tradeIn = Math.max(0, sc.tradeInValue || 0);
  const equity = tradeEquity(tradeIn, current.balance || 0);
  const used = isUsedVehicleType(sc.vehicleType);
  const vehicleAgeYears = used ? Math.max(0, sc.vehicleAgeYears ?? 0) : 0;
  const retainedResolved = resolveRetainedPercent({
    retainedField: sc.retainedValuePercent,
    vehicleAgeYears,
    horizonMonths,
    isUsed: used,
  });
  const retainedPercent = retainedResolved.value;

  if (equity < 0) {
    warnings.push(
      warn("NEGATIVE_EQUITY", "warn", { amount: Math.abs(equity) }),
    );
  }

  const taxComputed = computeVehicleTaxes({
    province: g.province,
    purchasePrice,
    tradeInValue: tradeIn,
    channel: sc.channel || "dealer",
    disposalMethod: sc.disposalMethod || "trade_in",
    vehicleType: sc.vehicleType || "used_gas",
  });

  const taxesResolved = resolveFieldValue({
    mode: fieldMode(sc.taxes).mode,
    manual: fieldMode(sc.taxes).manual,
    computed: taxComputed.total,
  });

  const licensingResolved = resolveFieldValue({
    mode: fieldMode(sc.licensing).mode,
    manual: fieldMode(sc.licensing).manual,
    computed: defaultLicensing(g.province),
  });

  const opsDefaults = defaultOperatingCosts({
    province: g.province,
    vehicleType: sc.vehicleType,
    annualKm: g.annualKm,
    currentInsurance: fieldMode(current.insurance).manual || 180,
    gasPerLitre:
      fieldMode(sc.gasPrice).mode === "manual"
        ? fieldMode(sc.gasPrice).manual
        : null,
    elecPerKwh:
      fieldMode(sc.elecRate).mode === "manual"
        ? fieldMode(sc.elecRate).manual
        : null,
    LPer100km:
      !String(sc.vehicleType || "").includes("ev") &&
      fieldMode(sc.efficiency).mode === "manual"
        ? fieldMode(sc.efficiency).manual
        : null,
    kWhPer100km:
      String(sc.vehicleType || "").includes("ev") &&
      fieldMode(sc.efficiency).mode === "manual"
        ? fieldMode(sc.efficiency).manual
        : null,
  });

  const insurance = resolveFieldValue({
    mode: fieldMode(sc.insurance).mode,
    manual: fieldMode(sc.insurance).manual,
    computed: opsDefaults.insurance,
  });
  const mo = resolveFieldValue({
    mode: fieldMode(sc.mo).mode,
    manual: fieldMode(sc.mo).manual,
    computed: opsDefaults.mo,
  });
  const fuel = resolveFieldValue({
    mode: fieldMode(sc.fuel).mode,
    manual: fieldMode(sc.fuel).manual,
    computed: opsDefaults.fuel,
  });

  const forceEvapOff =
    fieldMode(sc.evRebateEligible).mode === "manual" &&
    fieldMode(sc.evRebateEligible).manual === false;
  const forceEvapOn =
    fieldMode(sc.evRebateEligible).mode === "manual" &&
    fieldMode(sc.evRebateEligible).manual === true;
  const forceProvOff =
    fieldMode(sc.provincialRebateEligible).mode === "manual" &&
    fieldMode(sc.provincialRebateEligible).manual === false;
  const forceProvOn =
    fieldMode(sc.provincialRebateEligible).mode === "manual" &&
    fieldMode(sc.provincialRebateEligible).manual === true;

  const incentives = computeEvIncentives({
    province: g.province,
    vehicleType: sc.vehicleType,
    purchasePrice: stickerPrice,
    alreadyClaimedEvap: Boolean(sc.alreadyClaimedEvap),
    includeIncomeTested: Boolean(sc.includeIncomeTestedRebates),
    forceEligible: forceEvapOn || null,
    forceIneligible: forceEvapOff || null,
  });

  if (forceProvOff) {
    incentives.provincial.eligible = false;
    incentives.provincial.amount = 0;
    incentives.total = incentives.federal.amount;
    incentives.appliedToPrincipal = incentives.total;
  } else if (forceProvOn && incentives.provincial.amount === 0) {
    const boosted = computeEvIncentives({
      province: g.province,
      vehicleType: sc.vehicleType,
      purchasePrice: stickerPrice,
      includeIncomeTested: true,
      forceEligible: true,
    });
    incentives.provincial = boosted.provincial;
    incentives.total = incentives.federal.amount + incentives.provincial.amount;
    incentives.appliedToPrincipal = incentives.total;
  }

  if (
    String(sc.vehicleType || "").includes("ev") &&
    !incentives.federal.eligible &&
    incentives.federal.reasons.includes("price_cap")
  ) {
    warnings.push(
      warn("REBATE_INELIGIBLE", "warn", {
        reason: "EVAP price cap ($50,000)",
        price: stickerPrice,
      }),
    );
  }
  if (sc.alreadyClaimedEvap) {
    warnings.push(info("EVAP_ALREADY_CLAIMED"));
  }

  const taxes = taxesResolved.value;
  const licensing = licensingResolved.value;
  const financeTaxes = sc.financeTaxes !== false;

  const negativeEquity = Math.max(0, -equity);
  const positiveEquity = Math.max(0, equity);
  const down = Math.max(0, sc.downPayment || 0);

  let amountFinancedComputed =
    purchasePrice +
    (financeTaxes ? taxes : 0) +
    licensing +
    negativeEquity -
    down -
    positiveEquity -
    (incentives.appliedToPrincipal || 0);
  amountFinancedComputed = Math.max(0, amountFinancedComputed);

  const amountFinanced = resolveFieldValue({
    mode: fieldMode(sc.amountFinanced).mode,
    manual: fieldMode(sc.amountFinanced).manual,
    computed: amountFinancedComputed,
  });

  const paymentComputed = loanPayment(
    amountFinanced.value,
    sc.apr || 0,
    sc.termMonths || 60,
    sc.paymentFreq || "monthly",
  );
  const paymentResolved = resolveFieldValue({
    mode: fieldMode(sc.loanPayment).mode,
    manual: fieldMode(sc.loanPayment).manual,
    computed: paymentComputed,
  });

  const loanMonthly = normalizeToMonthly(
    paymentResolved.value,
    sc.paymentFreq || "monthly",
  );
  const operatingMonthly = sumOperatingMonthly({
    insurance: insurance.value,
    mo: mo.value,
    fuel: fuel.value,
  });
  const cashAllInMonthly = loanMonthly + operatingMonthly;

  const cashToClose =
    down + (financeTaxes ? 0 : taxes) + (financeTaxes ? 0 : licensing);

  const interest = totalInterest(
    amountFinanced.value,
    sc.apr || 0,
    sc.termMonths || 60,
    sc.paymentFreq || "monthly",
  );

  const openingEquity = equity;
  const upfrontCash = cashToClose;
  const horizon = computeHorizonEconomics({
    horizonMonths,
    openingEquity,
    upfrontCash,
    loanPrincipal: amountFinanced.value,
    apr: sc.apr || 0,
    termMonths: sc.termMonths || 60,
    paymentFreq: sc.paymentFreq || "monthly",
    operatingMonthly,
    assetValue: stickerPrice,
    retainedPercent,
  });

  const vsTarget = cashAllInMonthly - target;

  if (vsTarget > 1) {
    warnings.push(
      warn("OVER_TARGET", "warn", {
        over: vsTarget,
        allIn: cashAllInMonthly,
        target,
      }),
    );
  }
  if (horizon.terminalEquity < 0) {
    warnings.push(
      warn("UNDERWATER_AT_HORIZON", "warn", {
        amount: Math.abs(horizon.terminalEquity),
      }),
    );
  }
  if ((sc.termMonths || 0) > 84) {
    warnings.push(warn("LONG_TERM", "info", { months: sc.termMonths }));
  }
  if (taxComputed.luxuryTax > 0) {
    warnings.push(
      warn("LUXURY_TAX", "info", { amount: taxComputed.luxuryTax }),
    );
  }
  if (g.province === "BC") {
    const near = BC_PST_TIER_BOUNDARIES.some(
      (b) => Math.abs(purchasePrice - b) <= 2_000,
    );
    if (near) warnings.push(info("BC_PST_TIER_NEAR", { price: purchasePrice }));
  }

  const modes = {
    taxes: taxesResolved,
    licensing: licensingResolved,
    insurance,
    mo,
    fuel,
    amountFinanced,
    loanPayment: paymentResolved,
    dealerFees: dealerFeesResolved,
  };
  if (anyManualOverride(modes)) {
    warnings.push(info("MANUAL_OVERRIDE_ACTIVE"));
  }

  return {
    scenarioId: sc.id,
    name: sc.name,
    purchasePrice: stickerPrice,
    purchasePriceWithFees: purchasePrice,
    tradeInValue: tradeIn,
    tradeEquity: equity,
    taxes,
    taxBreakdown: taxComputed,
    tradeInTaxSaved: taxComputed.tradeInTaxSaved,
    licensing,
    rebates: incentives,
    amountFinanced: amountFinanced.value,
    loanPayment: paymentResolved.value,
    loanMonthly,
    insurance: insurance.value,
    mo: mo.value,
    fuel: fuel.value,
    operatingMonthly,
    cashAllInMonthly,
    economicMonthly: horizon.economicMonthly,
    targetCashAllInMonthly: target,
    ownershipHorizonMonths: horizonMonths,
    vehicleAgeYears,
    retainedPercent: horizon.retainedPercent,
    retainedSuggested: suggestedRetainedPercent({
      vehicleAgeYears,
      horizonMonths,
      isUsed: used,
    }),
    terminalVehicleValue: horizon.terminalVehicleValue,
    remainingLoanBalance: horizon.remainingLoanBalance,
    terminalEquity: horizon.terminalEquity,
    netHorizonCost: horizon.netHorizonCost,
    horizonBreakdown: {
      openingEquity: horizon.openingEquity,
      upfrontCash: horizon.upfrontCash,
      loanPaymentsTotal: horizon.loanPaymentsTotal,
      operatingTotal: horizon.operatingTotal,
      terminalEquityCredit: horizon.terminalEquity,
    },
    vsTarget,
    cashToClose: Math.max(0, cashToClose),
    totalInterest: interest,
    financeTaxes,
    modes,
    warnings,
    derivedFromOverride: Object.fromEntries(
      Object.entries(modes).map(([k, v]) => [k, Boolean(v.derivedFromOverride)]),
    ),
    target,
  };
}

/**
 * Amount financed as a function of sticker purchase price P (for max-budget solve).
 */
export function amountFinancedAtPrice(inputs, scenario, stickerPrice) {
  const g = inputs.global;
  const current = inputs.current;
  const sc = { ...scenario, purchasePrice: stickerPrice };
  const dealerFees =
    fieldMode(sc.dealerFees).mode === "manual"
      ? fieldMode(sc.dealerFees).manual
      : 499;
  const purchasePrice = Math.max(0, stickerPrice + (dealerFees || 0));
  const tradeIn = Math.max(0, sc.tradeInValue || 0);
  const equity = tradeEquity(tradeIn, current.balance || 0);
  const taxes = computeVehicleTaxes({
    province: g.province,
    purchasePrice,
    tradeInValue: tradeIn,
    channel: sc.channel || "dealer",
    disposalMethod: sc.disposalMethod || "trade_in",
    vehicleType: sc.vehicleType || "used_gas",
  }).total;
  const licensing =
    fieldMode(sc.licensing).mode === "manual"
      ? fieldMode(sc.licensing).manual
      : defaultLicensing(g.province);
  const incentives = computeEvIncentives({
    province: g.province,
    vehicleType: sc.vehicleType,
    purchasePrice: stickerPrice,
    alreadyClaimedEvap: Boolean(sc.alreadyClaimedEvap),
    includeIncomeTested: Boolean(sc.includeIncomeTestedRebates),
  });
  const financeTaxes = sc.financeTaxes !== false;
  const negativeEquity = Math.max(0, -equity);
  const positiveEquity = Math.max(0, equity);
  const down = Math.max(0, sc.downPayment || 0);
  return Math.max(
    0,
    purchasePrice +
      (financeTaxes ? taxes : 0) +
      licensing +
      negativeEquity -
      down -
      positiveEquity -
      incentives.appliedToPrincipal,
  );
}

/**
 * Cash all-in monthly for a candidate purchase price (max-budget binary search).
 */
export function cashAllInAtPrice(inputs, scenario, stickerPrice) {
  const sim = simulateScenario(inputs, { ...scenario, purchasePrice: stickerPrice });
  return sim.cashAllInMonthly;
}

/** @deprecated economic search helper — prefer cashAllInAtPrice */
export function economicMonthlyAtPrice(inputs, scenario, stickerPrice) {
  const sim = simulateScenario(inputs, { ...scenario, purchasePrice: stickerPrice });
  return sim.economicMonthly;
}

/**
 * Reverse-solve max pre-tax purchase price for the scenario's cash all-in target.
 */
export function solveMaxBudget(inputs, scenario) {
  const sc = scenario;
  const target = scenarioCashTarget(sc);

  const opsDefaults = defaultOperatingCosts({
    province: inputs.global.province,
    vehicleType: sc.vehicleType,
    annualKm: inputs.global.annualKm,
    currentInsurance: fieldMode(inputs.current.insurance).manual || 180,
  });
  const insurance = resolveFieldValue({
    mode: fieldMode(sc.insurance).mode,
    manual: fieldMode(sc.insurance).manual,
    computed: opsDefaults.insurance,
  }).value;
  const mo = resolveFieldValue({
    mode: fieldMode(sc.mo).mode,
    manual: fieldMode(sc.mo).manual,
    computed: opsDefaults.mo,
  }).value;
  const fuel = resolveFieldValue({
    mode: fieldMode(sc.fuel).mode,
    manual: fieldMode(sc.fuel).manual,
    computed: opsDefaults.fuel,
  }).value;
  const operatingMonthly = sumOperatingMonthly({ insurance, mo, fuel });
  const maxLoanMonthly = target - operatingMonthly;

  if (maxLoanMonthly <= 0) {
    return {
      feasible: false,
      maxPurchasePrice: 0,
      maxLoanPaymentMonthly: maxLoanMonthly,
      maxAmountFinanced: 0,
      operatingMonthly,
      bindingConstraint: "OPERATING_EXCEEDS_TARGET",
      impliedCashAllInMonthly: operatingMonthly,
      impliedEconomicMonthly: 0,
      error: "OPERATING_EXCEEDS_TARGET",
    };
  }

  const paymentAtFreq =
    (maxLoanMonthly * 12) /
    (sc.paymentFreq === "weekly" ? 52 : sc.paymentFreq === "biweekly" ? 26 : 12);

  const maxAmountFinanced = invertLoanPayment(
    paymentAtFreq,
    sc.apr || 0,
    sc.termMonths || 60,
    sc.paymentFreq || "monthly",
  );

  let lo = 0;
  let hi = 250_000;
  let best = 0;
  let bindingConstraint = "cash_target";

  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const financed = amountFinancedAtPrice(inputs, sc, mid);
    if (financed <= maxAmountFinanced) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const simAtBest = simulateScenario(inputs, { ...sc, purchasePrice: Math.round(best) });

  if (best <= 0) {
    return {
      feasible: false,
      maxPurchasePrice: 0,
      maxLoanPaymentMonthly: maxLoanMonthly,
      maxAmountFinanced,
      operatingMonthly,
      bindingConstraint: "CASH_TARGET_INFEASIBLE",
      impliedCashAllInMonthly: cashAllInAtPrice(inputs, sc, 0),
      impliedEconomicMonthly: simAtBest.economicMonthly,
      error: "CASH_TARGET_INFEASIBLE",
    };
  }

  const incentivesAtBest = computeEvIncentives({
    province: inputs.global.province,
    vehicleType: sc.vehicleType,
    purchasePrice: best,
    alreadyClaimedEvap: Boolean(sc.alreadyClaimedEvap),
    includeIncomeTested: Boolean(sc.includeIncomeTestedRebates),
  });
  if (
    String(sc.vehicleType || "").includes("ev") &&
    best >= 50_000 &&
    !incentivesAtBest.federal.eligible
  ) {
    bindingConstraint = "EVAP_PRICE_CAP";
  }
  if (inputs.global.province === "BC") {
    for (const b of BC_PST_TIER_BOUNDARIES) {
      if (Math.abs(best - b) < 500) {
        bindingConstraint = `PST_TIER_NEAR_${b}`;
        break;
      }
    }
  }

  return {
    feasible: true,
    maxPurchasePrice: Math.round(best),
    maxLoanPaymentMonthly: maxLoanMonthly,
    maxAmountFinanced,
    operatingMonthly,
    bindingConstraint,
    impliedCashAllInMonthly: simAtBest.cashAllInMonthly,
    impliedEconomicMonthly: simAtBest.economicMonthly,
    terminalEquity: simAtBest.terminalEquity,
    paymentAtFreq,
  };
}

/**
 * Resolve a scenario's effective purchase price. When `priceMode === "solved"`
 * the price tracks the scenario's own max-affordable cash budget.
 */
export function resolveEffectiveScenario(inputs, scenario) {
  if (!scenario || scenario.priceMode !== "solved") return scenario;
  const mb = solveMaxBudget(inputs, scenario);
  if (!mb.feasible) return scenario;
  return { ...scenario, purchasePrice: mb.maxPurchasePrice, priceSolved: true };
}

/**
 * Compare all scenarios + current + max budget for active scenario.
 */
export function compareScenarios(inputs) {
  const current = simulateCurrent(inputs);
  const scenarios = (inputs.scenarios || []).map((sc) =>
    simulateScenario(inputs, resolveEffectiveScenario(inputs, sc)),
  );

  const active = activeScenario(inputs);
  const maxBudget = active ? solveMaxBudget(inputs, active) : null;
  const activeTarget = scenarioCashTarget(active);

  for (const s of scenarios) {
    const ownMax = solveMaxBudget(
      inputs,
      (inputs.scenarios || []).find((raw) => raw.id === s.scenarioId) || active,
    );
    if (ownMax?.feasible && s.purchasePrice > ownMax.maxPurchasePrice + 1) {
      s.warnings = [
        ...(s.warnings || []),
        warn("OVER_MAX_BUDGET", "warn", {
          over: s.purchasePrice - ownMax.maxPurchasePrice,
          max: ownMax.maxPurchasePrice,
        }),
      ];
      s.overMaxBudget = s.purchasePrice - ownMax.maxPurchasePrice;
    } else {
      s.overMaxBudget = 0;
    }
    // Decision deltas use cash; economic vs-current kept for information.
    s.vsCurrent = current.cashAllInMonthly - s.cashAllInMonthly;
    s.vsCurrentEconomic = current.economicMonthly - s.economicMonthly;
    s.meetsTarget = s.cashAllInMonthly <= scenarioCashTarget(
      (inputs.scenarios || []).find((raw) => raw.id === s.scenarioId),
    ) + 0.5;
  }

  const under = scenarios.filter((s) => s.meetsTarget);
  const best = (under.length ? under : scenarios).slice().sort(
    (a, b) => a.cashAllInMonthly - b.cashAllInMonthly,
  )[0] || null;

  const warnings = [
    ...(maxBudget && !maxBudget.feasible && maxBudget.error === "OPERATING_EXCEEDS_TARGET"
      ? [error("OPERATING_EXCEEDS_TARGET")]
      : []),
    ...scenarios.flatMap((s) => s.warnings || []),
  ];

  const seen = new Set();
  const uniqueWarnings = warnings.filter((w) => {
    const key = `${w.code}:${JSON.stringify(w.params || {})}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    current,
    scenarios,
    best,
    maxBudget,
    targetCashAllInMonthly: activeTarget,
    ownershipHorizonMonths: scenarioHorizonMonths(active),
    warnings: uniqueWarnings,
  };
}

/** @deprecated use cashAllInMonthly or economicMonthly */
export function legacyAllInMonthly(sim) {
  return sim.cashAllInMonthly ?? sim.allInMonthly;
}

export { terminalVehicleValue, suggestedRetainedPercent, isUsedVehicleType };
