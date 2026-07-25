import { useTranslation } from "react-i18next";
import { useTheme } from "./ThemeProvider.jsx";

const OPTIONS = [
  { value: "light", key: "light" },
  { value: "dark", key: "dark" },
  { value: "system", key: "system" },
];

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex rounded-full border border-default bg-surface-card p-0.5 text-xs"
    >
      {OPTIONS.map(({ value, key }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            aria-pressed={active}
            className={`rounded-full px-2 py-1 font-medium transition-colors ${
              active ? "bg-indigo-600 text-white" : "text-muted hover:text-heading"
            }`}
          >
            {t(`theme.${key}`)}
          </button>
        );
      })}
    </div>
  );
}
