/** Warning level helpers for the SwapMyCar model. */

export function warn(code, level = "warn", params = {}) {
  return { code, level, params };
}

export function info(code, params = {}) {
  return warn(code, "info", params);
}

export function error(code, params = {}) {
  return warn(code, "error", params);
}
