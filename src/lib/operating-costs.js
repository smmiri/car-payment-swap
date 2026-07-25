/**
 * Fuel/electricity and default insurance / M&O estimates.
 * RULES_AS_OF: July 2026
 */

/** Province gas ($/L) and residential electricity ($/kWh) presets. */
export const ENERGY_PRESETS = {
  BC: { gasPerLitre: 1.75, elecPerKwh: 0.12 },
  AB: { gasPerLitre: 1.45, elecPerKwh: 0.18 },
  SK: { gasPerLitre: 1.5, elecPerKwh: 0.16 },
  MB: { gasPerLitre: 1.48, elecPerKwh: 0.1 },
  ON: { gasPerLitre: 1.55, elecPerKwh: 0.14 },
  QC: { gasPerLitre: 1.52, elecPerKwh: 0.08 },
  NB: { gasPerLitre: 1.6, elecPerKwh: 0.14 },
  NS: { gasPerLitre: 1.62, elecPerKwh: 0.17 },
  NL: { gasPerLitre: 1.7, elecPerKwh: 0.14 },
  PE: { gasPerLitre: 1.65, elecPerKwh: 0.16 },
  YT: { gasPerLitre: 1.85, elecPerKwh: 0.18 },
  NT: { gasPerLitre: 1.9, elecPerKwh: 0.28 },
  NU: { gasPerLitre: 1.95, elecPerKwh: 0.35 },
};

/** Provinces with public auto insurance — flag for methodology / warnings. */
export const PUBLIC_INSURANCE_PROVINCES = new Set(["BC", "MB", "SK", "QC"]);

export const DEFAULT_GAS_L_PER_100 = 7.5;
export const DEFAULT_EV_KWH_PER_100 = 18;
export const DEFAULT_HOME_CHARGE_PCT = 0.85;
export const DEFAULT_MO_GAS = 100;
export const DEFAULT_MO_EV = 60;
export const EV_INSURANCE_UPLIFT = 1.15;

export function isEvType(vehicleType) {
  return (
    vehicleType === "new_ev_bev" ||
    vehicleType === "new_ev_phev" ||
    vehicleType === "used_ev"
  );
}

export function energyPreset(province = "ON") {
  return ENERGY_PRESETS[province] ?? ENERGY_PRESETS.ON;
}

/**
 * Monthly fuel cost for ICE.
 */
export function gasMonthlyCost({
  annualKm = 20_000,
  LPer100km = DEFAULT_GAS_L_PER_100,
  gasPerLitre = 1.55,
} = {}) {
  return ((annualKm / 100) * LPer100km * gasPerLitre) / 12;
}

/**
 * Monthly electricity cost for EV (home charging share).
 */
export function evMonthlyCost({
  annualKm = 20_000,
  kWhPer100km = DEFAULT_EV_KWH_PER_100,
  elecPerKwh = 0.14,
  homeChargePct = DEFAULT_HOME_CHARGE_PCT,
} = {}) {
  return ((annualKm / 100) * kWhPer100km * elecPerKwh * homeChargePct) / 12;
}

/**
 * Auto defaults for a replacement vehicle's operating costs.
 */
export function defaultOperatingCosts({
  province = "ON",
  vehicleType = "new_gas",
  annualKm = 20_000,
  currentInsurance = 180,
  gasPerLitre = null,
  elecPerKwh = null,
  LPer100km = null,
  kWhPer100km = null,
  homeChargePct = DEFAULT_HOME_CHARGE_PCT,
} = {}) {
  const preset = energyPreset(province);
  const ev = isEvType(vehicleType);
  const gasPrice = gasPerLitre ?? preset.gasPerLitre;
  const elecPrice = elecPerKwh ?? preset.elecPerKwh;
  const efficiencyGas = LPer100km ?? DEFAULT_GAS_L_PER_100;
  const efficiencyEv = kWhPer100km ?? DEFAULT_EV_KWH_PER_100;

  const fuel = ev
    ? evMonthlyCost({
        annualKm,
        kWhPer100km: efficiencyEv,
        elecPerKwh: elecPrice,
        homeChargePct,
      })
    : gasMonthlyCost({
        annualKm,
        LPer100km: efficiencyGas,
        gasPerLitre: gasPrice,
      });

  const insurance = (currentInsurance || 180) * (ev ? EV_INSURANCE_UPLIFT : 1);
  const mo = ev ? DEFAULT_MO_EV : DEFAULT_MO_GAS;

  return {
    insurance,
    mo,
    fuel,
    gasPerLitre: gasPrice,
    elecPerKwh: elecPrice,
    LPer100km: efficiencyGas,
    kWhPer100km: efficiencyEv,
    homeChargePct,
    isEv: ev,
    publicInsurance: PUBLIC_INSURANCE_PROVINCES.has(province),
  };
}

export function sumOperatingMonthly({ insurance = 0, mo = 0, fuel = 0 } = {}) {
  return Math.max(0, insurance) + Math.max(0, mo) + Math.max(0, fuel);
}
