import { PROVINCE_CODES } from "./vehicle-taxes.js";

export { PROVINCE_CODES };

export const VEHICLE_TYPES = [
  "new_gas",
  "used_gas",
  "new_ev_bev",
  "new_ev_phev",
  "used_ev",
];

export const CHANNELS = ["dealer", "private"];
export const DISPOSAL_METHODS = ["trade_in", "private_sale"];
export const FREQ_OPTIONS = ["monthly", "biweekly", "weekly"];
export const MODE_OPTIONS = ["auto", "manual", "solved"];
export const PRICE_MODES = ["manual", "solved"];

function modeField(defaultMode = "auto", manual = 0) {
  return { mode: defaultMode, manual };
}

export function createScenario(overrides = {}) {
  const { id: overrideId, ...rest } = overrides;
  const id =
    overrideId ||
    `sc_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  return {
    id,
    name: "Replacement option",
    channel: "dealer",
    disposalMethod: "trade_in",
    vehicleType: "used_gas",
    vehicleAgeYears: 4,
    priceMode: "manual",
    purchasePrice: 28_000,
    tradeInValue: 16_000,
    retainedValuePercent: modeField("auto", 50),
    downPayment: 2_000,
    apr: 6.9,
    termMonths: 60,
    paymentFreq: "monthly",
    financeTaxes: true,
    alreadyClaimedEvap: false,
    includeIncomeTestedRebates: false,
    dealerFees: modeField("auto", 499),
    licensing: modeField("auto", 135),
    insurance: modeField("auto", 180),
    mo: modeField("auto", 100),
    fuel: modeField("auto", 180),
    gasPrice: modeField("auto", 1.55),
    elecRate: modeField("auto", 0.14),
    efficiency: modeField("auto", 7.5),
    evRebateEligible: modeField("auto", true),
    provincialRebateEligible: modeField("auto", true),
    taxes: modeField("auto", 0),
    amountFinanced: modeField("auto", 0),
    loanPayment: modeField("auto", 0),
    ...rest,
  };
}

export const DEFAULT_SCENARIO = createScenario({
  id: "sc_mid",
  name: "Mid trade-in",
  tradeInValue: 16_000,
});

export const DEFAULT_INPUTS = {
  global: {
    province: "ON",
    targetEconomicMonthly: 800,
    ownershipHorizonMonths: 60,
    targetFreq: "monthly",
    annualKm: 20_000,
  },
  current: {
    balance: 18_000,
    marketValue: 20_000,
    vehicleAgeYears: 5,
    retainedValuePercent: modeField("auto", 50),
    payment: 520,
    freq: "monthly",
    remainingTermMonths: 36,
    apr: 5.9,
    insurance: modeField("manual", 180),
    mo: modeField("manual", 100),
    fuel: modeField("manual", 200),
  },
  scenarios: [
    createScenario({
      id: "sc_low",
      name: "Low trade-in",
      tradeInValue: 14_000,
    }),
    createScenario({
      id: "sc_mid",
      name: "Mid trade-in",
      tradeInValue: 16_000,
    }),
    createScenario({
      id: "sc_high",
      name: "High trade-in",
      tradeInValue: 18_000,
    }),
  ],
  activeScenarioId: "sc_mid",
};

export const FIELD_META = {
  province: {
    kind: "select",
    label: "Province",
    help: "Drives vehicle taxes, licensing presets, energy prices, and EV rebates.",
    group: "global",
  },
  targetEconomicMonthly: {
    kind: "number",
    label: "Target economic cost / month",
    suffix: "$",
    step: 25,
    min: 0,
    help: "Goal for net horizon ownership cost divided by your ownership horizon (includes exit equity, not just loan payment).",
    group: "global",
  },
  ownershipHorizonMonths: {
    kind: "number",
    label: "Ownership horizon",
    suffix: "mo",
    step: 6,
    min: 12,
    max: 120,
    help: "How long you plan to keep the vehicle before selling or trading. Drives terminal equity and economic monthly cost.",
    group: "global",
  },
  marketValue: {
    kind: "number",
    label: "Current market value",
    suffix: "$",
    step: 500,
    min: 0,
    help: "Estimated private-party or trade-in value today. Used for keep-path terminal equity.",
    group: "current",
  },
  vehicleAgeYears: {
    kind: "number",
    label: "Vehicle age",
    suffix: "yr",
    step: 1,
    min: 0,
    max: 30,
    help: "Age of the vehicle today. For used cars, early depreciation is already in the purchase price — older cars retain more of today's value over the same horizon.",
    group: "scenario",
  },
  retainedValuePercent: {
    kind: "number",
    label: "Retained value at horizon",
    suffix: "%",
    step: 5,
    min: 0,
    max: 100,
    help: "Percent of purchase/market value retained at the ownership horizon. Auto uses an age-aware curve (used cars skip the steep new-car drop); override manually if you have a better estimate.",
    group: "current",
  },
  targetAllInMonthly: {
    kind: "number",
    label: "Target all-in monthly",
    suffix: "$",
    step: 25,
    min: 0,
    help: "Legacy field — migrated to target economic cost.",
    group: "global",
  },
  annualKm: {
    kind: "number",
    label: "Annual kilometres",
    suffix: "km",
    step: 1000,
    min: 0,
    help: "Used for auto fuel/electricity estimates.",
    group: "global",
  },
  balance: {
    kind: "number",
    label: "Remaining loan balance",
    suffix: "$",
    step: 250,
    min: 0,
    help: "Payoff amount on your current car.",
    group: "current",
  },
  payment: {
    kind: "number",
    label: "Current payment",
    suffix: "$",
    step: 10,
    min: 0,
    help: "Payment amount at the frequency you select.",
    group: "current",
  },
  purchasePrice: {
    kind: "number",
    label: "Purchase price (pre-tax)",
    suffix: "$",
    step: 500,
    min: 0,
    help: "Sticker / negotiated price before tax. Dealer fees are added separately when taxable.",
    group: "scenario",
  },
  tradeInValue: {
    kind: "number",
    label: "Trade-in / sale value",
    suffix: "$",
    step: 250,
    min: 0,
    help: "Primary sensitivity variable. At a dealer, trade-in reduces the taxable base (BC: rate still from full price).",
    group: "scenario",
  },
  downPayment: {
    kind: "number",
    label: "Down payment",
    suffix: "$",
    step: 250,
    min: 0,
    help: "Cash at signing (separate from positive trade equity).",
    group: "scenario",
  },
  apr: {
    kind: "slider",
    label: "Financing APR",
    suffix: "%",
    step: 0.05,
    min: 0,
    max: 25,
    help: "Nominal annual rate. Auto loans compound monthly (not Canadian mortgage semi-annual).",
    group: "scenario",
  },
  termMonths: {
    kind: "number",
    label: "Term",
    suffix: "mo",
    step: 6,
    min: 12,
    max: 96,
    help: "Loan term in months. Typical range 48–84.",
    group: "scenario",
  },
};
