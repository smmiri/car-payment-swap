import { useTranslation } from "react-i18next";
import StatCard from "./StatCard.jsx";
import { useFormat } from "../hooks/useFormat.js";

export default function SummaryCards({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { current, targetEconomicMonthly, maxBudget, best, ownershipHorizonMonths } = results;

  const maxLabel = maxBudget?.feasible
    ? fmt.formatCurrency(maxBudget.maxPurchasePrice)
    : t("summary.infeasible");
  const maxSub = maxBudget?.feasible
    ? `${t("summary.economicAtMax")}: ${fmt.formatCurrency(maxBudget.impliedEconomicMonthly)}/mo`
    : null;

  const bestTone =
    best == null ? "neutral" : best.meetsTarget ? "positive" : "negative";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={t("summary.currentEconomic")}
        value={fmt.formatCurrency(current.economicMonthly)}
        sublabel={`${t("summary.cashAllIn")}: ${fmt.formatCurrency(current.cashAllInMonthly)}/mo`}
        help={t("summary.currentEconomicHelp", { months: ownershipHorizonMonths })}
        tone="neutral"
      />
      <StatCard
        label={t("summary.targetEconomic")}
        value={fmt.formatCurrency(targetEconomicMonthly)}
        help={t("summary.targetEconomicHelp", { months: ownershipHorizonMonths })}
        tone="primary"
      />
      <StatCard
        label={t("summary.maxBudget")}
        value={maxLabel}
        sublabel={maxSub}
        help={t("summary.maxBudgetHelp")}
        tone="buy"
      />
      <StatCard
        label={t("summary.bestScenario")}
        value={best ? best.name : "—"}
        sublabel={
          best
            ? `${fmt.formatCurrency(best.economicMonthly)}/mo · ${
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
