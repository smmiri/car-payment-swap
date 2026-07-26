import { useTranslation } from "react-i18next";
import StatCard from "./StatCard.jsx";
import { useFormat } from "../hooks/useFormat.js";

export default function SummaryCards({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { current, targetCashAllInMonthly, maxBudget, best, ownershipHorizonMonths } = results;

  const maxLabel = maxBudget?.feasible
    ? fmt.formatCurrency(maxBudget.maxPurchasePrice)
    : t("summary.infeasible");
  const maxSub = maxBudget?.feasible
    ? `${t("summary.cashAtMax")}: ${fmt.formatCurrency(maxBudget.impliedCashAllInMonthly)}/mo`
    : null;

  const bestTone = best == null ? "neutral" : best.meetsTarget ? "positive" : "negative";

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label={t("summary.currentCash")}
        value={fmt.formatCurrency(current.cashAllInMonthly)}
        sublabel={`${t("summary.economicMonthly")}: ${fmt.formatCurrency(current.economicMonthly)}/mo`}
        help={t("summary.currentCashHelp", { months: ownershipHorizonMonths })}
        tone="neutral"
      />
      <StatCard
        label={t("summary.targetCash")}
        value={fmt.formatCurrency(targetCashAllInMonthly)}
        help={t("summary.targetCashHelp")}
        tone="primary"
      />
      <StatCard
        label={t("summary.maxBudget")}
        value={maxLabel}
        sublabel={maxSub}
        help={t("summary.maxBudgetHelp")}
        tone="neutral"
      />
      <StatCard
        label={t("summary.bestScenario")}
        value={best ? best.name : "—"}
        sublabel={
          best
            ? `${fmt.formatCurrency(best.cashAllInMonthly)}/mo · ${
                best.meetsTarget ? t("summary.underTarget") : t("summary.overTarget")
              }`
            : null
        }
        help={t("summary.bestHelp")}
        tone={bestTone}
      />
    </div>
  );
}
