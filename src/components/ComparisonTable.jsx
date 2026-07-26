import { useTranslation } from "react-i18next";
import { useFormat } from "../hooks/useFormat.js";

export default function ComparisonTable({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const rows = results.scenarios || [];

  return (
    <div className="overflow-x-auto panel-shell">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-subtle bg-surface-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">{t("table.scenario")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.tradeIn")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.price")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.cashAllIn")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.vsTarget")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.vsCurrent")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.ownership")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.economic")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.terminalEquity")}</th>
            <th className="px-4 py-3 font-semibold">{t("table.cashToClose")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((s) => {
            const isBest = results.best?.scenarioId === s.scenarioId;
            return (
              <tr
                key={s.scenarioId}
                className={isBest ? "bg-emerald-50/60 dark:bg-emerald-950/30" : undefined}
              >
                <td className="px-4 py-3 font-medium text-heading">
                  {s.name}
                  {isBest ? (
                    <span className="ms-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      Best
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums">{fmt.formatCurrency(s.tradeInValue)}</td>
                <td className="px-4 py-3 tabular-nums">{fmt.formatCurrency(s.purchasePrice)}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-heading">
                  {fmt.formatCurrency(s.cashAllInMonthly)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${
                    s.vsTarget <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {fmt.formatSignedCurrency(s.vsTarget)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${
                    s.vsCurrent >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {fmt.formatSignedCurrency(s.vsCurrent)}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">
                  {fmt.formatCurrency(s.ownershipMonthly)}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">
                  {fmt.formatCurrency(s.economicMonthly)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${
                    s.terminalEquity >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {fmt.formatSignedCurrency(s.terminalEquity)}
                </td>
                <td className="px-4 py-3 tabular-nums">{fmt.formatCurrency(s.cashToClose)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
