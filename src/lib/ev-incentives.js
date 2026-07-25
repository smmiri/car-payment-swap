/**
 * Federal EVAP + provincial EV rebate table.
 * RULES_AS_OF: July 2026 — see site-meta.js
 *
 * Federal EVAP (Feb 16, 2026 – Mar 31, 2031):
 *   BEV/FCEV $5,000; PHEV $2,500; used $0
 *   Final transaction value ≤ $50,000 (Canadian-built may waive cap — not modeled)
 *
 * Provincial: QC Roulez vert, MB; income-tested programs default off.
 */

export const EVAP_PRICE_CAP = 50_000;
export const EVAP_BEV_AMOUNT = 5_000;
export const EVAP_PHEV_AMOUNT = 2_500;

/**
 * @param {object} opts
 * @param {string} opts.vehicleType
 * @param {number} opts.purchasePrice
 * @param {boolean} [opts.alreadyClaimedEvap]
 * @param {boolean} [opts.forceEligible] — manual override force-on
 * @param {boolean} [opts.forceIneligible] — manual override force-off
 */
export function computeFederalEvap({
  vehicleType = "new_gas",
  purchasePrice = 0,
  alreadyClaimedEvap = false,
  forceEligible = null,
  forceIneligible = null,
} = {}) {
  const isBev = vehicleType === "new_ev_bev";
  const isPhev = vehicleType === "new_ev_phev";
  const isNewEv = isBev || isPhev;
  const amount = isBev ? EVAP_BEV_AMOUNT : isPhev ? EVAP_PHEV_AMOUNT : 0;
  const overCap = purchasePrice > EVAP_PRICE_CAP;
  const reasons = [];

  if (!isNewEv) reasons.push("not_new_ev");
  if (alreadyClaimedEvap) reasons.push("already_claimed");
  if (overCap) reasons.push("price_cap");

  let eligible = isNewEv && !alreadyClaimedEvap && !overCap && amount > 0;
  if (forceIneligible === true) eligible = false;
  if (forceEligible === true && isNewEv && amount > 0) eligible = true;

  return {
    program: "EVAP",
    eligible,
    amount: eligible ? amount : 0,
    maxAmount: amount,
    priceCap: EVAP_PRICE_CAP,
    overCap,
    reasons,
  };
}

/**
 * Provincial rebate table (July 2026). Income-tested programs default to $0.
 */
export function computeProvincialRebate({
  province = "ON",
  vehicleType = "new_gas",
  purchasePrice = 0,
  includeIncomeTested = false,
  forceEligible = null,
  forceIneligible = null,
} = {}) {
  const isNewBev = vehicleType === "new_ev_bev";
  const isNewPhev = vehicleType === "new_ev_phev";
  const isNewEv = isNewBev || isNewPhev;
  const isUsedEv = vehicleType === "used_ev";

  let amount = 0;
  let program = null;
  let note = null;
  let eligible = false;

  if (province === "QC") {
    program = "Roulez vert";
    note = "Program ends Dec 31, 2026; MSRP < $65k new";
    if (isNewEv && purchasePrice < 65_000) {
      amount = 2_000;
      eligible = true;
    } else if (isUsedEv) {
      amount = 1_000;
      eligible = true;
    }
  } else if (province === "MB") {
    program = "MB EV rebate";
    if (isNewEv) {
      amount = 4_000;
      eligible = true;
    } else if (isUsedEv) {
      amount = 2_500;
      eligible = true;
    }
  } else if (includeIncomeTested && (province === "BC" || province === "NS" || province === "PE")) {
    program = province === "BC" ? "CleanBC Go Electric" : `${province} EV incentive`;
    note = "Income-tested — enable only if you qualify; confirm with program site";
    if (isNewEv) {
      amount = province === "BC" ? 4_000 : 2_500;
      eligible = true;
    }
  }

  if (forceIneligible === true) {
    eligible = false;
    amount = 0;
  }
  if (forceEligible === true && (isNewEv || isUsedEv)) {
    eligible = true;
    if (amount === 0) amount = isUsedEv ? 1_000 : 2_000;
  }
  if (!eligible) amount = 0;

  return { program, eligible, amount, note };
}

/**
 * Combined incentives applied against amount financed (point-of-sale model).
 * Government rebates do not reduce BC PST base (sticker remains pre-rebate).
 */
export function computeEvIncentives(opts = {}) {
  const federal = computeFederalEvap(opts);
  const provincial = computeProvincialRebate(opts);
  const total = federal.amount + provincial.amount;
  return {
    federal,
    provincial,
    total,
    appliedToPrincipal: total,
  };
}
