/**
 * Province-aware Canadian vehicle purchase taxes.
 *
 * BC PST-116 / PST-308 (critical):
 *   - PST *rate* from full purchase price (tiered passenger / ZEV bands)
 *   - PST *base* = purchase_price − trade_in (dealer only)
 *   - GST 5% on net after trade-in
 *   - Federal luxury tax on pre-tax price; not reduced by trade-in; PST does not apply to luxury tax
 *   - Private sale: no trade-in credit
 *
 * RULES_AS_OF: July 2026 — see site-meta.js
 */

export const PROVINCES = {
  BC: { name: "British Columbia", regime: "GST_PST", pstRate: null },
  AB: { name: "Alberta", regime: "GST", pstRate: 0 },
  SK: { name: "Saskatchewan", regime: "GST_PST", pstRate: 0.06 },
  MB: { name: "Manitoba", regime: "GST_PST", pstRate: 0.07 },
  ON: { name: "Ontario", regime: "HST", hstRate: 0.13 },
  QC: { name: "Quebec", regime: "GST_QST", qstRate: 0.09975 },
  NB: { name: "New Brunswick", regime: "HST", hstRate: 0.15 },
  NS: { name: "Nova Scotia", regime: "HST", hstRate: 0.15 },
  NL: { name: "Newfoundland & Labrador", regime: "HST", hstRate: 0.15 },
  PE: { name: "Prince Edward Island", regime: "HST", hstRate: 0.15 },
  YT: { name: "Yukon", regime: "GST", pstRate: 0 },
  NT: { name: "Northwest Territories", regime: "GST", pstRate: 0 },
  NU: { name: "Nunavut", regime: "GST", pstRate: 0 },
};

export const PROVINCE_CODES = Object.keys(PROVINCES);
export const GST_RATE = 0.05;
export const LUXURY_TAX_THRESHOLD = 100_000;

/** BC passenger vehicle PST bands — rate from full purchase price (PST-308). */
export const BC_PASSENGER_PST_BANDS = [
  { upTo: 55_000, rate: 0.07 },
  { upTo: 56_000, rate: 0.08 },
  { upTo: 57_000, rate: 0.09 },
  { upTo: 125_000, rate: 0.1 },
  { upTo: 150_000, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];

/** BC ZEV PST bands — separate (generally lower entry) tiers. */
export const BC_ZEV_PST_BANDS = [
  { upTo: 75_000, rate: 0.07 },
  { upTo: 77_000, rate: 0.08 },
  { upTo: 79_000, rate: 0.09 },
  { upTo: 125_000, rate: 0.1 },
  { upTo: 150_000, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];

export const BC_PST_TIER_BOUNDARIES = [55_000, 56_000, 57_000, 75_000, 125_000, 150_000];

export function isZevType(vehicleType) {
  return (
    vehicleType === "new_ev_bev" ||
    vehicleType === "new_ev_phev" ||
    vehicleType === "used_ev"
  );
}

/**
 * Lookup BC PST rate from full purchase price.
 */
export function bcPstRate(purchasePrice, { isZev = false } = {}) {
  const bands = isZev ? BC_ZEV_PST_BANDS : BC_PASSENGER_PST_BANDS;
  const price = Math.max(0, purchasePrice);
  for (const band of bands) {
    if (price < band.upTo) return band.rate;
  }
  return bands[bands.length - 1].rate;
}

/**
 * Federal luxury tax on vehicles: lesser of 10% of full value or 20% of amount over $100k.
 * Applies to new vehicles above the threshold; not reduced by trade-in.
 */
export function computeLuxuryTax(purchasePrice, { isNew = true } = {}) {
  if (!isNew || !(purchasePrice > LUXURY_TAX_THRESHOLD)) return 0;
  const over = purchasePrice - LUXURY_TAX_THRESHOLD;
  return Math.min(purchasePrice * 0.1, over * 0.2);
}

/**
 * Trade-in credit for tax base. Applies only when buying from a dealer AND the
 * current car is handed to that dealer as a trade-in. A private sale of the old
 * car (or a private purchase) yields no trade-in tax credit — the money is just
 * cash the buyer brings.
 */
export function tradeInTaxCredit({
  channel = "dealer",
  tradeInValue = 0,
  disposalMethod = "trade_in",
} = {}) {
  if (channel !== "dealer") return 0;
  if (disposalMethod === "private_sale") return 0;
  return Math.max(0, tradeInValue);
}

/**
 * Compute purchase taxes for a vehicle.
 *
 * @param {object} opts
 * @param {string} opts.province
 * @param {number} opts.purchasePrice - sticker + taxable dealer fees (pre-tax)
 * @param {number} [opts.tradeInValue]
 * @param {'dealer'|'private'} [opts.channel]
 * @param {string} [opts.vehicleType]
 * @param {boolean} [opts.isPassenger]
 */
export function computeVehicleTaxes({
  province = "ON",
  purchasePrice = 0,
  tradeInValue = 0,
  channel = "dealer",
  disposalMethod = "trade_in",
  vehicleType = "new_gas",
  isPassenger = true,
} = {}) {
  const info = PROVINCES[province] || PROVINCES.ON;
  const price = Math.max(0, purchasePrice);
  const credit = tradeInTaxCredit({ channel, tradeInValue, disposalMethod });
  const netBase = Math.max(0, price - credit);
  const isNew = vehicleType === "new_gas" || vehicleType === "new_ev_bev" || vehicleType === "new_ev_phev";
  const isZev = isZevType(vehicleType);
  const luxuryTax = computeLuxuryTax(price, { isNew });

  let gst = 0;
  let hst = 0;
  let pst = 0;
  let qst = 0;
  let pstRate = 0;
  let gstHstRate = 0;
  const breakdown = [];

  if (info.regime === "HST") {
    gstHstRate = info.hstRate;
    hst = netBase * gstHstRate;
    breakdown.push({
      code: "hst",
      label: "HST",
      rate: gstHstRate,
      base: netBase,
      amount: hst,
    });
  } else if (info.regime === "GST_QST") {
    gst = netBase * GST_RATE;
    qst = netBase * info.qstRate;
    gstHstRate = GST_RATE;
    breakdown.push({
      code: "gst",
      label: "GST",
      rate: GST_RATE,
      base: netBase,
      amount: gst,
    });
    breakdown.push({
      code: "qst",
      label: "QST",
      rate: info.qstRate,
      base: netBase,
      amount: qst,
    });
  } else if (info.regime === "GST_PST") {
    gst = netBase * GST_RATE;
    gstHstRate = GST_RATE;
    breakdown.push({
      code: "gst",
      label: "GST",
      rate: GST_RATE,
      base: netBase,
      amount: gst,
    });

    if (province === "BC" && isPassenger) {
      pstRate = bcPstRate(price, { isZev });
      pst = netBase * pstRate;
      breakdown.push({
        code: "pst",
        label: "BC PST",
        rate: pstRate,
        base: netBase,
        rateFromPrice: price,
        amount: pst,
        note: "Rate from full purchase price; tax on net after trade-in (PST-116)",
      });
    } else if (info.pstRate > 0) {
      pstRate = info.pstRate;
      pst = netBase * pstRate;
      breakdown.push({
        code: "pst",
        label: "Provincial sales tax",
        rate: pstRate,
        base: netBase,
        amount: pst,
      });
    }
  } else {
    // GST-only (AB, territories)
    gst = netBase * GST_RATE;
    gstHstRate = GST_RATE;
    breakdown.push({
      code: "gst",
      label: "GST",
      rate: GST_RATE,
      base: netBase,
      amount: gst,
    });
  }

  if (luxuryTax > 0) {
    breakdown.push({
      code: "luxury",
      label: "Federal luxury tax",
      base: price,
      amount: luxuryTax,
      note: "Not reduced by trade-in",
    });
  }

  const taxesWithoutTradeIn = computeTaxesOnBase({
    province,
    price,
    base: price,
    isPassenger,
    isZev,
    luxuryTax,
  });
  const tradeInTaxSaved = Math.max(0, taxesWithoutTradeIn - (gst + hst + pst + qst));

  const total = gst + hst + pst + qst + luxuryTax;

  return {
    province,
    channel,
    disposalMethod,
    purchasePrice: price,
    tradeInCredit: credit,
    netTaxableBase: netBase,
    gst,
    hst,
    pst,
    qst,
    pstRate,
    gstHstRate,
    luxuryTax,
    total,
    tradeInTaxSaved,
    breakdown,
  };
}

function computeTaxesOnBase({ province, price, base, isPassenger, isZev, luxuryTax }) {
  const info = PROVINCES[province] || PROVINCES.ON;
  if (info.regime === "HST") return base * info.hstRate + luxuryTax;
  if (info.regime === "GST_QST") return base * GST_RATE + base * info.qstRate + luxuryTax;
  if (info.regime === "GST_PST") {
    let pst = 0;
    if (province === "BC" && isPassenger) pst = base * bcPstRate(price, { isZev });
    else if (info.pstRate > 0) pst = base * info.pstRate;
    return base * GST_RATE + pst + luxuryTax;
  }
  return base * GST_RATE + luxuryTax;
}

/** Rough one-time licensing / registration presets by province. */
export const LICENSING_DEFAULTS = {
  BC: 175,
  AB: 120,
  SK: 150,
  MB: 160,
  ON: 135,
  QC: 230,
  NB: 140,
  NS: 130,
  NL: 180,
  PE: 125,
  YT: 100,
  NT: 100,
  NU: 100,
};

export function defaultLicensing(province = "ON") {
  return LICENSING_DEFAULTS[province] ?? 150;
}
