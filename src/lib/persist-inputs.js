import {
  DEFAULT_INPUTS,
  createScenario,
  MODE_OPTIONS,
  VEHICLE_TYPES,
  CHANNELS,
  DISPOSAL_METHODS,
  PRICE_MODES,
  FREQ_OPTIONS,
} from "./defaults.js";
import { PROVINCE_CODES } from "./vehicle-taxes.js";

/** Primary storage key (localStorage). Cookie used when payload fits. */
export const INPUTS_STORAGE_KEY = "smc_inputs";
export const INPUTS_COOKIE_NAME = "smc_inputs";
export const INPUTS_COOKIE_MAX_AGE_DAYS = 365;
/** Stay under typical 4KB cookie limit with margin. */
export const INPUTS_COOKIE_MAX_BYTES = 3800;

const MODE_SET = new Set(MODE_OPTIONS);
const VEHICLE_SET = new Set(VEHICLE_TYPES);
const CHANNEL_SET = new Set(CHANNELS);
const DISPOSAL_SET = new Set(DISPOSAL_METHODS);
const PRICE_MODE_SET = new Set(PRICE_MODES);
const FREQ_SET = new Set(FREQ_OPTIONS);
const PROVINCE_SET = new Set(PROVINCE_CODES);

function sanitizeModeField(value, fallback) {
  const base = fallback && typeof fallback === "object" ? fallback : { mode: "auto", manual: 0 };
  if (!value || typeof value !== "object") return { ...base };
  const mode = MODE_SET.has(value.mode) ? value.mode : base.mode;
  let manual = base.manual;
  if (typeof value.manual === "boolean") manual = value.manual;
  else if (typeof value.manual === "number" && Number.isFinite(value.manual)) manual = value.manual;
  return { mode, manual };
}

function sanitizeScenario(raw, fallback) {
  const base = createScenario(fallback || {});
  if (!raw || typeof raw !== "object") return base;

  const out = { ...base };
  if (typeof raw.id === "string" && raw.id.length > 0 && raw.id.length < 64) out.id = raw.id;
  if (typeof raw.name === "string" && raw.name.length < 80) out.name = raw.name;
  if (CHANNEL_SET.has(raw.channel)) out.channel = raw.channel;
  if (DISPOSAL_SET.has(raw.disposalMethod)) out.disposalMethod = raw.disposalMethod;
  if (PRICE_MODE_SET.has(raw.priceMode)) out.priceMode = raw.priceMode;
  if (VEHICLE_SET.has(raw.vehicleType)) out.vehicleType = raw.vehicleType;
  if (FREQ_SET.has(raw.paymentFreq)) out.paymentFreq = raw.paymentFreq;

  for (const key of ["purchasePrice", "tradeInValue", "downPayment", "apr", "termMonths", "vehicleAgeYears"]) {
    if (typeof raw[key] === "number" && Number.isFinite(raw[key])) out[key] = raw[key];
  }
  // Legacy plain number was a flat default, not a deliberate override — keep Auto
  // so vehicle age can drive the retained-value curve.
  if (typeof raw.retainedValuePercent === "number" && Number.isFinite(raw.retainedValuePercent)) {
    out.retainedValuePercent = {
      mode: "auto",
      manual: Math.min(100, Math.max(0, raw.retainedValuePercent)),
    };
  } else {
    const retained = sanitizeModeField(raw.retainedValuePercent, base.retainedValuePercent);
    if (typeof retained.manual === "number") {
      retained.manual = Math.min(100, Math.max(0, retained.manual));
    }
    out.retainedValuePercent = retained;
  }
  if (typeof raw.financeTaxes === "boolean") out.financeTaxes = raw.financeTaxes;
  if (typeof raw.alreadyClaimedEvap === "boolean") out.alreadyClaimedEvap = raw.alreadyClaimedEvap;
  if (typeof raw.includeIncomeTestedRebates === "boolean") {
    out.includeIncomeTestedRebates = raw.includeIncomeTestedRebates;
  }

  for (const key of [
    "dealerFees",
    "licensing",
    "insurance",
    "mo",
    "fuel",
    "gasPrice",
    "elecRate",
    "efficiency",
    "evRebateEligible",
    "provincialRebateEligible",
    "taxes",
    "amountFinanced",
    "loanPayment",
  ]) {
    out[key] = sanitizeModeField(raw[key], base[key]);
  }
  return out;
}

/**
 * Merge saved values onto defaults with enum whitelist for nested scenarios.
 */
export function mergeSavedInputs(saved, defaults = DEFAULT_INPUTS) {
  if (!saved || typeof saved !== "object") {
    return structuredClone(defaults);
  }

  const out = structuredClone(defaults);

  if (saved.global && typeof saved.global === "object") {
    if (PROVINCE_SET.has(saved.global.province)) out.global.province = saved.global.province;
    if (
      typeof saved.global.targetEconomicMonthly === "number" &&
      Number.isFinite(saved.global.targetEconomicMonthly)
    ) {
      out.global.targetEconomicMonthly = saved.global.targetEconomicMonthly;
    } else if (
      typeof saved.global.targetAllInMonthly === "number" &&
      Number.isFinite(saved.global.targetAllInMonthly)
    ) {
      out.global.targetEconomicMonthly = saved.global.targetAllInMonthly;
    }
    if (
      typeof saved.global.ownershipHorizonMonths === "number" &&
      Number.isFinite(saved.global.ownershipHorizonMonths)
    ) {
      out.global.ownershipHorizonMonths = Math.min(
        120,
        Math.max(12, Math.round(saved.global.ownershipHorizonMonths)),
      );
    }
    if (FREQ_SET.has(saved.global.targetFreq)) out.global.targetFreq = saved.global.targetFreq;
    if (typeof saved.global.annualKm === "number" && Number.isFinite(saved.global.annualKm)) {
      out.global.annualKm = saved.global.annualKm;
    }
  }

  if (saved.current && typeof saved.current === "object") {
    for (const key of ["balance", "payment", "remainingTermMonths", "apr", "marketValue", "vehicleAgeYears"]) {
      if (typeof saved.current[key] === "number" && Number.isFinite(saved.current[key])) {
        out.current[key] = saved.current[key];
      }
    }
    if (typeof saved.current.retainedValuePercent === "number" && Number.isFinite(saved.current.retainedValuePercent)) {
      out.current.retainedValuePercent = {
        mode: "auto",
        manual: Math.min(100, Math.max(0, saved.current.retainedValuePercent)),
      };
    } else if (saved.current.retainedValuePercent && typeof saved.current.retainedValuePercent === "object") {
      out.current.retainedValuePercent = sanitizeModeField(
        saved.current.retainedValuePercent,
        out.current.retainedValuePercent,
      );
    }
    if (FREQ_SET.has(saved.current.freq)) out.current.freq = saved.current.freq;
    out.current.insurance = sanitizeModeField(saved.current.insurance, out.current.insurance);
    out.current.mo = sanitizeModeField(saved.current.mo, out.current.mo);
    out.current.fuel = sanitizeModeField(saved.current.fuel, out.current.fuel);
  }

  if (Array.isArray(saved.scenarios) && saved.scenarios.length > 0) {
    const capped = saved.scenarios.slice(0, 8);
    // Don't pass default scenario ids as fallbacks — missing/duplicate saved ids
    // would all collapse onto sc_low / sc_mid and break tab selection.
    out.scenarios = ensureUniqueScenarioIds(
      capped.map((s, i) => {
        const template = defaults.scenarios[i] || defaults.scenarios[0];
        const { id: _ignoreId, ...templateWithoutId } = template;
        return sanitizeScenario(s, templateWithoutId);
      }),
    );
  }

  if (typeof saved.activeScenarioId === "string") {
    const ids = new Set(out.scenarios.map((s) => s.id));
    if (ids.has(saved.activeScenarioId)) out.activeScenarioId = saved.activeScenarioId;
    else out.activeScenarioId = out.scenarios[0]?.id;
  } else {
    out.activeScenarioId = out.scenarios[0]?.id;
  }

  return out;
}

/** Assign fresh ids when missing or colliding (legacy cookies often had undefined). */
export function ensureUniqueScenarioIds(scenarios) {
  const seen = new Set();
  return (scenarios || []).map((s, i) => {
    let id = typeof s?.id === "string" && s.id.length > 0 ? s.id : "";
    if (!id || seen.has(id)) {
      id = `sc_${i}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
    }
    seen.add(id);
    return { ...s, id };
  });
}

/** Compact JSON (no URI encoding) for localStorage / size checks. */
export function serializeInputsJson(inputs) {
  return JSON.stringify(inputs);
}

/** URI-encoded payload for cookie writes. */
export function serializeInputs(inputs) {
  return encodeURIComponent(serializeInputsJson(inputs));
}

export function parseInputsCookieValue(raw, defaults = DEFAULT_INPUTS) {
  if (!raw || typeof raw !== "string") return null;
  try {
    let json = raw.trim();
    try {
      json = decodeURIComponent(json);
    } catch {
      // already plain JSON
    }
    if (json.length > 200_000) return null;
    const saved = JSON.parse(json);
    return mergeSavedInputs(saved, defaults);
  } catch {
    return null;
  }
}

export function readCookieValue(name) {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

export function loadInputsFromCookie(defaults = DEFAULT_INPUTS) {
  if (typeof localStorage !== "undefined") {
    try {
      const ls = localStorage.getItem(INPUTS_STORAGE_KEY);
      if (ls) {
        const parsed = parseInputsCookieValue(ls, defaults);
        if (parsed) return parsed;
      }
    } catch {
      // ignore
    }
  }
  const raw = readCookieValue(INPUTS_COOKIE_NAME);
  return parseInputsCookieValue(raw, defaults);
}

export function writeInputsToCookie(inputs) {
  const json = serializeInputsJson(inputs);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(INPUTS_STORAGE_KEY, json);
    } catch {
      // ignore quota
    }
  }

  if (typeof document === "undefined") return true;
  const encoded = encodeURIComponent(json);
  if (encoded.length > INPUTS_COOKIE_MAX_BYTES) {
    // Clear stale oversized cookie; localStorage is source of truth.
    document.cookie = `${INPUTS_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return true;
  }

  const maxAge = INPUTS_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  let cookie = `${INPUTS_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  if (secure) cookie += "; Secure";
  document.cookie = cookie;
  return true;
}

export function clearInputsCookie() {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(INPUTS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  if (typeof document === "undefined") return;
  document.cookie = `${INPUTS_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
