/**
 * Resolve a field that may be auto-computed or manually overridden.
 *
 * @param {{ mode?: string, manual?: number|boolean|null, computed: number|boolean }} opts
 * @returns {{ value: number|boolean, mode: string, derivedFromOverride: boolean }}
 */
export function resolveFieldValue({ mode = "auto", manual = null, computed }) {
  const normalized = mode === "manual" || mode === "solved" ? mode : "auto";

  if (normalized === "manual") {
    const value =
      typeof computed === "boolean"
        ? Boolean(manual)
        : Number.isFinite(manual)
          ? Number(manual)
          : computed;
    return { value, mode: "manual", derivedFromOverride: true };
  }

  if (normalized === "solved") {
    const value = Number.isFinite(manual) ? Number(manual) : computed;
    return { value, mode: "solved", derivedFromOverride: false };
  }

  return { value: computed, mode: "auto", derivedFromOverride: false };
}

/**
 * @param {Record<string, { mode?: string }>} modes
 */
export function anyManualOverride(modes = {}) {
  return Object.values(modes).some((m) => m?.mode === "manual");
}
