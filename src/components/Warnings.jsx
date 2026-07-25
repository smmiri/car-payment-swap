import { useTranslation } from "react-i18next";
import { useFormat } from "../hooks/useFormat.js";

const TONE = {
  error: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  info: "border-default bg-surface-inset text-label",
};

export default function Warnings({ items }) {
  const { t } = useTranslation("warnings");
  const fmt = useFormat();

  if (!items?.length) return null;

  const warningText = (w) => {
    const params = { ...(w.params || {}) };
    for (const key of Object.keys(params)) {
      if (typeof params[key] === "number" && /amount|over|max|price|allIn|target/i.test(key)) {
        params[key] = fmt.formatCurrency(params[key]);
      }
    }
    // i18next currency format may fail on plain strings — use preformatted values with simple templates
    const template = t(w.code, { defaultValue: w.code, ...params });
    return template;
  };

  return (
    <ul aria-label="Model warnings" className="space-y-2">
      {items.map((w, i) => (
        <li
          key={`${w.level}-${w.code}-${i}`}
          className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${TONE[w.level] ?? TONE.info}`}
        >
          <span className="font-semibold uppercase tracking-wide opacity-70">{w.level}</span>
          <span className="ms-2">{warningText(w)}</span>
        </li>
      ))}
    </ul>
  );
}
