import { DEFAULT_INPUTS } from "./defaults.js";
import { mergeSavedInputs, serializeInputsJson } from "./persist-inputs.js";

/** Hash query key: `#share=v1.<payload>` */
export const SHARE_HASH_KEY = "share";
export const SHARE_PAYLOAD_VERSION = "v1";
/** Soft warn when the full URL exceeds this length (some messengers truncate). */
export const SHARE_URL_SOFT_MAX = 8_000;
/** Hard reject decode above this decoded JSON size. */
export const SHARE_JSON_MAX_CHARS = 200_000;

/**
 * UTF-8 bytes → base64url (no padding).
 * @param {Uint8Array} bytes
 */
export function bytesToBase64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * base64url → UTF-8 bytes.
 * @param {string} s
 */
export function base64UrlToBytes(s) {
  if (!s || typeof s !== "string") return null;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  try {
    const bin =
      typeof atob === "function"
        ? atob(b64 + pad)
        : Buffer.from(b64 + pad, "base64").toString("binary");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * Encode inputs into a share payload (`v1.<base64url>`).
 * Stores assumptions only — results are always recalculated on open.
 */
export function encodeSharePayload(inputs) {
  const json = serializeInputsJson(inputs);
  const bytes = new TextEncoder().encode(json);
  return `${SHARE_PAYLOAD_VERSION}.${bytesToBase64Url(bytes)}`;
}

/**
 * Decode a share payload into sanitized inputs, or null if invalid.
 */
export function decodeSharePayload(payload, defaults = DEFAULT_INPUTS) {
  if (!payload || typeof payload !== "string") return null;
  const trimmed = payload.trim();
  const dot = trimmed.indexOf(".");
  if (dot <= 0) return null;
  const version = trimmed.slice(0, dot);
  const body = trimmed.slice(dot + 1);
  if (version !== SHARE_PAYLOAD_VERSION || !body) return null;

  const bytes = base64UrlToBytes(body);
  if (!bytes) return null;

  let json;
  try {
    json = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  if (json.length > SHARE_JSON_MAX_CHARS) return null;

  try {
    const saved = JSON.parse(json);
    return mergeSavedInputs(saved, defaults);
  } catch {
    return null;
  }
}

/**
 * Build a share URL. Pass `baseUrl` (origin + pathname) for absolute links.
 */
export function buildShareUrl(inputs, baseUrl = "") {
  const payload = encodeSharePayload(inputs);
  const hash = `#${SHARE_HASH_KEY}=${payload}`;
  if (!baseUrl) return hash;
  const root = String(baseUrl).replace(/#.*$/, "").replace(/\/$/, "");
  return `${root}/${hash}`.replace(/\/+#/, "/#");
}

/**
 * Read `#share=` (or `?share=` fallback) from a Location-like object.
 * @returns {{ inputs: object, payload: string } | null}
 */
export function readShareFromLocation(locationLike) {
  if (!locationLike) return null;

  const fromHash = parseShareParam(locationLike.hash?.replace(/^#/, "") || "");
  if (fromHash) {
    const inputs = decodeSharePayload(fromHash);
    if (inputs) return { inputs, payload: fromHash };
  }

  const search = locationLike.search?.replace(/^\?/, "") || "";
  const fromSearch = parseShareParam(search);
  if (fromSearch) {
    const inputs = decodeSharePayload(fromSearch);
    if (inputs) return { inputs, payload: fromSearch };
  }

  return null;
}

function parseShareParam(queryOrHash) {
  if (!queryOrHash) return null;
  // Support `share=...` among other params; value may contain `=` from padding edge cases.
  const parts = queryOrHash.split("&");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = decodeURIComponent(part.slice(0, eq));
    if (key !== SHARE_HASH_KEY) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

/**
 * Remove share payload from the address bar without reloading.
 */
export function clearShareFromLocation(historyLike = typeof history !== "undefined" ? history : null, locationLike = typeof location !== "undefined" ? location : null) {
  if (!historyLike || !locationLike || typeof historyLike.replaceState !== "function") return;
  try {
    const url = new URL(locationLike.href);
    url.searchParams.delete(SHARE_HASH_KEY);
    // Drop entire hash if it was only the share payload; otherwise strip share= from hash.
    if (url.hash.includes(`${SHARE_HASH_KEY}=`)) {
      url.hash = "";
    }
    historyLike.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // ignore
  }
}

/**
 * Load shared inputs from the current location and clear the share fragment.
 * Returns sanitized inputs or null.
 */
export function consumeShareFromLocation(
  locationLike = typeof location !== "undefined" ? location : null,
  historyLike = typeof history !== "undefined" ? history : null,
) {
  const found = readShareFromLocation(locationLike);
  if (!found) return null;
  clearShareFromLocation(historyLike, locationLike);
  return found.inputs;
}
