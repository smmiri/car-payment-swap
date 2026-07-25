import { createContext, useContext, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, resolveIsDark, setStoredTheme } from "../lib/theme.js";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredTheme);
  const [, setSystemTick] = useState(0);

  useEffect(() => {
    setStoredTheme(preference);
    return applyTheme(preference);
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTick((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** Resolved appearance for charts and other theme-aware UI. */
  const resolved = resolveIsDark(preference) ? "dark" : "light";

  return (
    <ThemeContext.Provider value={{ preference, setPreference, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
