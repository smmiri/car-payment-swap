/** @typedef {'light' | 'dark' | 'system'} ThemePreference */

export const THEME_STORAGE_KEY = "smc_theme";
/** @type {ThemePreference[]} */
export const THEME_OPTIONS = ["light", "dark", "system"];

/**
 * @returns {ThemePreference}
 */
export function getStoredTheme() {
  if (typeof localStorage === "undefined") return "system";
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_OPTIONS.includes(value) ? value : "system";
}

/**
 * @param {ThemePreference} theme
 */
export function setStoredTheme(theme) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * @param {ThemePreference} preference
 */
export function resolveIsDark(preference) {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return systemPrefersDark();
}

/**
 * Apply resolved light/dark class to <html>. Returns cleanup when listening to OS theme.
 * @param {ThemePreference} preference
 */
export function applyTheme(preference) {
  if (typeof document === "undefined") return () => {};

  const apply = () => {
    const dark = resolveIsDark(preference);
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.dataset.theme = preference;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", dark ? "#020617" : "#f8fafc");

    const colorScheme = document.querySelector('meta[name="color-scheme"]');
    if (colorScheme) colorScheme.setAttribute("content", dark ? "dark light" : "light dark");
  };

  apply();

  if (preference !== "system") return () => {};

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", apply);
  return () => mq.removeEventListener("change", apply);
}
