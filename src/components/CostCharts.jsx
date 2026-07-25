import { useId, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useFormat } from "../hooks/useFormat.js";

const HORIZON_SERIES = [
  { key: "openingEquity", color: "#0f766e", nameKey: "openingEquity" },
  { key: "upfrontCash", color: "#d97706", nameKey: "upfrontCash" },
  { key: "loanPayments", color: "#2563eb", nameKey: "loanPayments" },
  { key: "operating", color: "#0e7490", nameKey: "operating" },
  { key: "exitEquity", color: "#10b981", nameKey: "terminalCredit" },
];

const CASH_SERIES = [
  { key: "loan", color: "#2563eb", label: "Loan" },
  { key: "insurance", color: "#4f46e5", label: "Insurance" },
  { key: "mo", color: "#0e7490", label: "M&O" },
  { key: "fuel", color: "#059669", label: "Fuel/elec" },
];

export default function CostCharts({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const gid = useId().replace(/:/g, "");

  const horizonBreakdown = useMemo(
    () =>
      (results.scenarios || []).map((s) => {
        const b = s.horizonBreakdown || {};
        const opening = Math.round(b.openingEquity || 0);
        const openingEquity = Math.abs(opening);
        const upfrontCash = Math.round(b.upfrontCash || 0);
        const loanPayments = Math.round(b.loanPaymentsTotal || 0);
        const operating = Math.round(b.operatingTotal || 0);
        const exitEquity = Math.round(Math.max(0, b.terminalEquityCredit || 0));
        return {
          name: s.name,
          openingEquity,
          upfrontCash,
          loanPayments,
          operating,
          exitEquity,
          totalCost: openingEquity + upfrontCash + loanPayments + operating,
          net: Math.round(s.netHorizonCost || 0),
        };
      }),
    [results.scenarios],
  );

  const cashBreakdown = useMemo(
    () =>
      (results.scenarios || []).map((s) => ({
        name: s.name,
        loan: Math.round(s.loanMonthly),
        insurance: Math.round(s.insurance),
        mo: Math.round(s.mo),
        fuel: Math.round(s.fuel),
        total: Math.round(s.cashAllInMonthly),
      })),
    [results.scenarios],
  );

  const savings = useMemo(
    () =>
      (results.scenarios || []).map((s) => ({
        name: s.name,
        savings: Math.round(s.vsCurrent),
        positive: s.vsCurrent >= 0,
      })),
    [results.scenarios],
  );

  const currencyTick = (v) => {
    const n = Number(v);
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return fmt.formatCurrency(n);
  };

  const axisTick = { fontSize: 11, fill: "currentColor", opacity: 0.55 };
  const manyScenarios = horizonBreakdown.length > 2;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartGradients id={gid} />

      <ChartCard
        title={t("calculator.chartHorizon")}
        subtitle={t("calculator.chartHorizonHint")}
      >
        <ResponsiveContainer width="100%" height={manyScenarios ? 300 : 250}>
          <BarChart
            layout="vertical"
            data={horizonBreakdown}
            margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            barCategoryGap="26%"
          >
            <CartesianGrid
              strokeDasharray="2 6"
              horizontal={false}
              className="stroke-slate-200/80 dark:stroke-slate-700/80"
            />
            <XAxis
              type="number"
              tick={axisTick}
              tickFormatter={currencyTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={112}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.045)" }}
              content={<StackTooltip fmt={fmt} totalKey="net" totalLabel="Net horizon" />}
            />
            <Legend content={<PillLegend />} />
            {HORIZON_SERIES.map((series, i) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                stackId="horizon"
                name={t(`charts.${series.nameKey}`)}
                fill={series.color}
                radius={i === HORIZON_SERIES.length - 1 ? [0, 10, 10, 0] : 0}
                maxBarSize={30}
                animationDuration={750}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t("calculator.chartBreakdown")}
        subtitle={t("calculator.chartBreakdownHint")}
      >
        <ResponsiveContainer width="100%" height={manyScenarios ? 300 : 250}>
          <BarChart
            data={cashBreakdown}
            margin={{ top: 18, right: 8, left: 0, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="2 6"
              vertical={false}
              className="stroke-slate-200/80 dark:stroke-slate-700/80"
            />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              tick={axisTick}
              tickFormatter={currencyTick}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.045)" }}
              content={<StackTooltip fmt={fmt} totalKey="total" totalLabel="Cash all-in" />}
            />
            <Legend content={<PillLegend />} />
            {CASH_SERIES.map((series, i) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                stackId="cash"
                name={series.label}
                fill={series.color}
                radius={i === CASH_SERIES.length - 1 ? [10, 10, 0, 0] : 0}
                maxBarSize={58}
                animationDuration={750}
              >
                {i === CASH_SERIES.length - 1 ? (
                  <LabelList
                    dataKey="total"
                    position="top"
                    offset={6}
                    formatter={(v) => fmt.formatCurrency(v)}
                    className="fill-slate-500 text-[10px] dark:fill-slate-400"
                  />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t("calculator.chartSavings")}
        subtitle={t("calculator.chartSavingsHint")}
        className="lg:col-span-2"
      >
        <ResponsiveContainer width="100%" height={230}>
          <BarChart
            data={savings}
            margin={{ top: 28, right: 16, left: 0, bottom: 4 }}
            barCategoryGap="34%"
          >
            <CartesianGrid
              strokeDasharray="2 6"
              vertical={false}
              className="stroke-slate-200/80 dark:stroke-slate-700/80"
            />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              tick={axisTick}
              tickFormatter={currencyTick}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.28} strokeWidth={1.5} />
            <Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.045)" }}
              content={<SavingsTooltip fmt={fmt} t={t} />}
            />
            <Bar
              dataKey="savings"
              name={t("charts.economicSavings")}
              radius={10}
              maxBarSize={72}
              animationDuration={850}
            >
              {savings.map((row) => (
                <Cell
                  key={row.name}
                  fill={row.positive ? `url(#${gid}-save)` : `url(#${gid}-cost)`}
                />
              ))}
              <LabelList
                dataKey="savings"
                position="top"
                offset={8}
                formatter={(v) => fmt.formatSignedCurrency(v)}
                className="fill-slate-600 text-[11px] font-semibold dark:fill-slate-300"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartGradients({ id }) {
  return (
    <svg width={0} height={0} className="absolute" aria-hidden>
      <defs>
        <linearGradient id={`${id}-save`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={`${id}-cost`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-default bg-surface-card shadow-sm ${className}`}
    >
      <div className="border-b border-default bg-gradient-to-br from-slate-50 via-white to-cyan-50/50 px-4 py-3 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 sm:px-5">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11px] leading-snug text-muted">{subtitle}</p> : null}
      </div>
      <div className="px-2 py-3 text-slate-600 dark:text-slate-400 sm:px-3">{children}</div>
    </div>
  );
}

function PillLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-1.5 px-2">
      {payload.map((entry) => (
        <li
          key={String(entry.value)}
          className="inline-flex items-center gap-1.5 rounded-md border border-default bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-label"
        >
          <span className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

function StackTooltip({ active, payload, label, fmt, totalKey, totalLabel = "Total" }) {
  if (!active || !payload?.length) return null;
  const total = payload[0]?.payload?.[totalKey];
  return (
    <div className="rounded-xl border border-default bg-surface-card px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-xs font-semibold text-heading">{label}</div>
      <ul className="space-y-1">
        {payload
          .filter((p) => Number(p.value) !== 0)
          .map((p) => (
            <li key={p.dataKey} className="flex items-center justify-between gap-6 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="tabular-nums font-medium text-heading">
                {fmt.formatCurrency(p.value)}
              </span>
            </li>
          ))}
      </ul>
      {Number.isFinite(total) ? (
        <div className="mt-2 flex justify-between border-t border-default pt-1.5 text-[11px] font-semibold text-heading">
          <span>{totalLabel}</span>
          <span className="tabular-nums">{fmt.formatCurrency(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

function SavingsTooltip({ active, payload, label, fmt, t }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  const better = v >= 0;
  return (
    <div className="rounded-xl border border-default bg-surface-card px-3 py-2 shadow-lg">
      <div className="text-xs font-semibold text-heading">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold tabular-nums ${
          better ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {fmt.formatSignedCurrency(v)}
        <span className="ms-1 text-[11px] font-normal text-muted">
          {better ? t("charts.vsCurrentBetter") : t("charts.vsCurrentWorse")}
        </span>
      </div>
    </div>
  );
}
