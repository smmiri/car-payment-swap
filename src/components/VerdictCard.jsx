import { useTranslation } from "react-i18next";
import { useFormat } from "../hooks/useFormat.js";

export default function VerdictCard({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { best, current } = results;

  if (!best) {
    return (
      <div className="panel-shell p-4">
        <p className="section-label">{t("summary.verdict")}</p>
        <p className="mt-1 text-sm text-muted">{t("summary.verdictEmpty")}</p>
      </div>
    );
  }

  const under = best.meetsTarget;
  const vsCurrent = best.vsCurrent;
  const betterThanKeep = vsCurrent >= 0;

  return (
    <div className="panel-shell p-4 sm:p-5">
      <p className="section-label">{t("summary.verdict")}</p>
      <p className="mt-1.5 text-base font-semibold text-heading sm:text-lg">
        {best.name}
        <span className="ms-2 text-sm font-medium tabular-nums text-muted">
          {fmt.formatCurrency(best.cashAllInMonthly)}
          <span className="font-normal">/mo</span>
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-md px-2 py-1 font-medium ${
            under
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
          }`}
        >
          {under ? t("summary.underTarget") : t("summary.overTarget")}
        </span>
        <span
          className={`rounded-md px-2 py-1 font-medium tabular-nums ${
            betterThanKeep
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
          }`}
        >
          {fmt.formatSignedCurrency(vsCurrent)} {t("summary.vsCurrent")}
        </span>
        <span className="rounded-md bg-surface-inset px-2 py-1 font-medium tabular-nums text-label">
          {t("summary.keepAt")} {fmt.formatCurrency(current.cashAllInMonthly)}/mo
        </span>
      </div>
    </div>
  );
}
