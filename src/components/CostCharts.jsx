import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Customized,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useFormat } from "../hooks/useFormat.js";

const HORIZON_COST_SERIES = [
  { key: "openingEquity", color: "#0f766e", nameKey: "openingEquity" },
  { key: "upfrontCash", color: "#d97706", nameKey: "upfrontCash" },
  { key: "principalPaid", color: "#1d4ed8", nameKey: "principalPaid" },
  { key: "interestPaid", color: "#7c3aed", nameKey: "interestPaid" },
  { key: "operating", color: "#0e7490", nameKey: "operating" },
];

const HORIZON_EQUITY = {
  key: "exitEquity",
  color: "#059669",
  nameKey: "exitEquityCredit",
};

const CASH_COST_SERIES = [
  { key: "principal", color: "#1d4ed8", labelKey: "charts.principal" },
  { key: "interest", color: "#7c3aed", labelKey: "charts.interest" },
  { key: "insurance", color: "#4f46e5", labelKey: "charts.insurance" },
  { key: "mo", color: "#0e7490", labelKey: "charts.mo" },
  { key: "fuel", color: "#059669", labelKey: "charts.fuel" },
];

const OWNERSHIP_SERIES = {
  key: "ownership",
  color: "#b45309",
  creditColor: "#059669",
  labelKey: "charts.ownership",
};

const NET_STROKE = "#334155";
const HORIZON_BAR = 34;
const MONTHLY_BAR = 48;

/** High-contrast net value chip (halo behind text). */
function NetValueLabel({ x, y, textAnchor = "middle", children }) {
  const label = String(children ?? "");
  // Approximate chip width from character count (tabular currency strings).
  const chipW = Math.max(52, label.length * 7.2 + 12);
  const chipH = 18;
  let chipX = x - chipW / 2;
  if (textAnchor === "start") chipX = x - 4;
  if (textAnchor === "end") chipX = x - chipW + 4;
  const chipY = y - chipH + 4;
  return (
    <g>
      <rect
        x={chipX}
        y={chipY}
        width={chipW}
        height={chipH}
        rx={5}
        ry={5}
        className="fill-white/95 stroke-slate-200 dark:fill-slate-900/95 dark:stroke-slate-600"
        strokeWidth={1}
      />
      <text
        x={textAnchor === "middle" ? x : textAnchor === "start" ? chipX + 6 : chipX + chipW - 6}
        y={chipY + 13}
        textAnchor={textAnchor}
        className="fill-slate-800 text-[11px] font-semibold tabular-nums dark:fill-slate-100"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {label}
      </text>
    </g>
  );
}


function toHorizonRow(s, name) {
  const b = s?.horizonBreakdown || {};
  const opening = Math.round(b.openingEquity ?? s?.openingEquity ?? 0);
  const openingEquity = Math.abs(opening);
  const upfrontCash = Math.round(b.upfrontCash ?? s?.upfrontCash ?? 0);
  const principalPaid = Math.round(b.principalPaid ?? s?.principalPaid ?? 0);
  const interestPaid = Math.round(b.interestPaid ?? s?.interestPaid ?? 0);
  const loanFallback = Math.round(b.loanPaymentsTotal ?? s?.loanPaymentsTotal ?? 0);
  const operating = Math.round(b.operatingTotal ?? s?.operatingTotal ?? 0);
  const terminalEquity = Math.round(b.terminalEquityCredit ?? s?.terminalEquity ?? 0);
  const exitEquityCredit = Math.max(0, terminalEquity);
  const principal = principalPaid || (interestPaid ? 0 : loanFallback);
  const interest = interestPaid;
  const grossCost = openingEquity + upfrontCash + principal + interest + operating;
  const net = Math.round(s?.netHorizonCost ?? grossCost - exitEquityCredit);
  return {
    name,
    openingEquity,
    upfrontCash,
    principalPaid: principal,
    interestPaid: interest,
    operating,
    exitEquity: -exitEquityCredit,
    grossCost,
    net,
  };
}

function toCashRow(s, name) {
  const cash = Math.round(s?.cashAllInMonthly || 0);
  const economic = Math.round(s?.economicMonthly || 0);
  const ownership = Math.round(s?.ownershipMonthly ?? economic - cash);
  const loan = Math.round(s?.loanMonthly || 0);
  let principal = Math.round(s?.principalMonthly ?? 0);
  let interest = Math.round(s?.interestMonthly ?? 0);
  if (principal + interest <= 0 && loan > 0) {
    principal = loan;
    interest = 0;
  } else if (principal + interest > 0 && loan > 0) {
    const mix = principal + interest;
    principal = Math.round((principal / mix) * loan);
    interest = Math.max(0, loan - principal);
  }
  return {
    name,
    principal,
    interest,
    insurance: Math.round(s?.insurance || 0),
    mo: Math.round(s?.mo || 0),
    fuel: Math.round(s?.fuel || 0),
    ownership,
    cashTotal: cash,
    net: economic,
  };
}

/**
 * Draw dashed net outlines on top of the stacked bars (same category center).
 * layout: "vertical" = horizon (category on Y); "horizontal" = monthly (category on X).
 */
function NetOverlays({
  xAxisMap,
  yAxisMap,
  data,
  layout,
  formatNet,
  maxBarSize,
}) {
  const xAxis = Object.values(xAxisMap || {})[0];
  const yAxis = Object.values(yAxisMap || {})[0];
  if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;

  if (layout === "horizontal") {
    const xScale = xAxis.scale;
    const yScale = yAxis.scale;
    const bandwidth = typeof xScale.bandwidth === "function" ? xScale.bandwidth() : maxBarSize;
    const barW = Math.min(maxBarSize, Math.max(8, bandwidth * 0.72));

    return (
      <g className="recharts-net-overlays" pointerEvents="none">
        {data.map((row) => {
          const bandStart = xScale(row.name);
          if (!Number.isFinite(bandStart) || !Number.isFinite(row.net)) return null;
          const x = bandStart + (bandwidth - barW) / 2;
          const y0 = yScale(0);
          const y1 = yScale(row.net);
          if (!Number.isFinite(y0) || !Number.isFinite(y1)) return null;
          const top = Math.min(y0, y1);
          const h = Math.max(Math.abs(y1 - y0), row.net === 0 ? 0 : 1);
          const labelY = row.net >= 0 ? top - 10 : top + h + 14;
          return (
            <g key={row.name}>
              <rect
                x={x}
                y={top}
                width={barW}
                height={h}
                fill="none"
                stroke={NET_STROKE}
                strokeWidth={2}
                strokeDasharray="6 4"
                rx={7}
                ry={7}
                className="dark:stroke-slate-200"
              />
              <NetValueLabel x={x + barW / 2} y={labelY} textAnchor="middle">
                {formatNet(row.net)}
              </NetValueLabel>
            </g>
          );
        })}
      </g>
    );
  }

  // Vertical layout (horizon): category on Y, values on X.
  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const bandwidth = typeof yScale.bandwidth === "function" ? yScale.bandwidth() : maxBarSize;
  const barH = Math.min(maxBarSize, Math.max(8, bandwidth * 0.72));

  return (
    <g className="recharts-net-overlays" pointerEvents="none">
      {data.map((row) => {
        const bandStart = yScale(row.name);
        if (!Number.isFinite(bandStart) || !Number.isFinite(row.net)) return null;
        const y = bandStart + (bandwidth - barH) / 2;
        const x0 = xScale(0);
        const x1 = xScale(row.net);
        if (!Number.isFinite(x0) || !Number.isFinite(x1)) return null;
        const left = Math.min(x0, x1);
        const w = Math.max(Math.abs(x1 - x0), row.net === 0 ? 0 : 1);
        const labelX = row.net >= 0 ? left + w + 10 : left - 10;
        return (
          <g key={row.name}>
            <rect
              x={left}
              y={y}
              width={w}
              height={barH}
              fill="none"
              stroke={NET_STROKE}
              strokeWidth={2}
              strokeDasharray="6 4"
              rx={5}
              ry={5}
              className="dark:stroke-slate-200"
            />
            <NetValueLabel
              x={labelX}
              y={y + barH / 2 + 5}
              textAnchor={row.net >= 0 ? "start" : "end"}
            >
              {formatNet(row.net)}
            </NetValueLabel>
          </g>
        );
      })}
    </g>
  );
}

export default function CostCharts({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const currentName = t("calculator.current");
  const netLabel = t("charts.netAggregate");

  const horizonBreakdown = useMemo(() => {
    const rows = [];
    if (results.current) rows.push(toHorizonRow(results.current, currentName));
    for (const s of results.scenarios || []) rows.push(toHorizonRow(s, s.name));
    return rows;
  }, [results.current, results.scenarios, currentName]);

  const cashBreakdown = useMemo(() => {
    const rows = [];
    if (results.current) rows.push(toCashRow(results.current, currentName));
    for (const s of results.scenarios || []) rows.push(toCashRow(s, s.name));
    return rows;
  }, [results.current, results.scenarios, currentName]);

  const currencyTick = (v) => {
    const n = Number(v);
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return fmt.formatCurrency(n);
  };

  const formatNet = (v) => fmt.formatCurrency(v);
  const axisTick = { fontSize: 12, fill: "currentColor", opacity: 0.78, fontWeight: 500 };
  const manyScenarios = horizonBreakdown.length > 3;
  const monthlyTick = (value) => {
    const s = String(value ?? "");
    if (s.length <= 14) return s;
    return `${s.slice(0, 12)}…`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title={t("calculator.chartHorizon")}
        subtitle={t("calculator.chartHorizonHint")}
      >
        <ResponsiveContainer width="100%" height={manyScenarios ? 320 : 280}>
          <BarChart
            layout="vertical"
            data={horizonBreakdown}
            stackOffset="sign"
            margin={{ top: 4, right: 72, left: 4, bottom: 4 }}
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
              width={128}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.28} />
            <Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.045)" }}
              content={
                <SignedTooltip
                  fmt={fmt}
                  t={t}
                  netKey="net"
                  netLabel={t("charts.netHorizon")}
                  grossKey="grossCost"
                  grossLabel={t("charts.grossCost")}
                />
              }
            />
            <Legend content={<PillLegend netLabel={netLabel} />} />
            {HORIZON_COST_SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                stackId="horizon"
                name={t(`charts.${series.nameKey}`)}
                fill={series.color}
                maxBarSize={HORIZON_BAR}
                animationDuration={750}
              />
            ))}
            <Bar
              dataKey={HORIZON_EQUITY.key}
              stackId="horizon"
              name={t(`charts.${HORIZON_EQUITY.nameKey}`)}
              fill={HORIZON_EQUITY.color}
              maxBarSize={HORIZON_BAR}
              animationDuration={750}
            />
            <Customized
              component={(props) => (
                <NetOverlays
                  {...props}
                  data={horizonBreakdown}
                  layout="vertical"
                  formatNet={formatNet}
                  maxBarSize={HORIZON_BAR}
                />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t("calculator.chartBreakdown")}
        subtitle={t("calculator.chartBreakdownHint")}
      >
        <ResponsiveContainer width="100%" height={manyScenarios ? 340 : 300}>
          <BarChart
            data={cashBreakdown}
            stackOffset="sign"
            margin={{ top: 36, right: 8, left: 0, bottom: 48 }}
            barCategoryGap="32%"
          >
            <CartesianGrid
              strokeDasharray="2 6"
              vertical={false}
              className="stroke-slate-200/80 dark:stroke-slate-700/80"
            />
            <XAxis
              dataKey="name"
              tick={axisTick}
              tickFormatter={monthlyTick}
              interval={0}
              angle={-28}
              textAnchor="end"
              height={56}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={axisTick}
              tickFormatter={currencyTick}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.28} />
            <Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.045)" }}
              content={
                <SignedTooltip
                  fmt={fmt}
                  t={t}
                  netKey="net"
                  netLabel={t("charts.economicTotal")}
                  grossKey="cashTotal"
                  grossLabel={t("charts.cashTotal")}
                />
              }
            />
            <Legend content={<PillLegend netLabel={netLabel} />} />
            {CASH_COST_SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                stackId="cash"
                name={t(series.labelKey)}
                fill={series.color}
                maxBarSize={MONTHLY_BAR}
                animationDuration={750}
              />
            ))}
            <Bar
              dataKey={OWNERSHIP_SERIES.key}
              stackId="cash"
              name={t(OWNERSHIP_SERIES.labelKey)}
              maxBarSize={MONTHLY_BAR}
              animationDuration={750}
            >
              {cashBreakdown.map((row) => (
                <Cell
                  key={row.name}
                  fill={
                    row.ownership >= 0
                      ? OWNERSHIP_SERIES.color
                      : OWNERSHIP_SERIES.creditColor
                  }
                />
              ))}
            </Bar>
            <Customized
              component={(props) => (
                <NetOverlays
                  {...props}
                  data={cashBreakdown}
                  layout="horizontal"
                  formatNet={formatNet}
                  maxBarSize={MONTHLY_BAR}
                />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`panel-shell ${className}`}>
      <div className="panel-header">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11px] leading-snug text-muted">{subtitle}</p> : null}
      </div>
      <div className="px-2 py-3 text-slate-600 dark:text-slate-400 sm:px-3">{children}</div>
    </div>
  );
}

function PillLegend({ payload, netLabel }) {
  const entries = [...(payload || [])];
  if (netLabel && !entries.some((e) => String(e.value) === netLabel)) {
    entries.push({ value: netLabel, type: "plainline", color: NET_STROKE });
  }
  if (!entries.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-1.5 px-2">
      {entries.map((entry) => {
        const isNet = entry.type === "plainline" || String(entry.value) === netLabel;
        return (
          <li
            key={String(entry.value)}
            className="inline-flex items-center gap-1.5 rounded-md border border-default bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-label"
          >
            {isNet ? (
              <span
                className="inline-block w-3 border-t-2 border-dashed border-slate-600 dark:border-slate-300"
                aria-hidden
              />
            ) : (
              <span className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
            )}
            {entry.value}
          </li>
        );
      })}
    </ul>
  );
}

function SignedTooltip({
  active,
  payload,
  label,
  fmt,
  t,
  netKey,
  netLabel,
  grossKey,
  grossLabel,
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const items = payload.filter((p) => Number(p.value) !== 0);
  return (
    <div className="rounded-xl border border-default bg-surface-card px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-xs font-semibold text-heading">{label}</div>
      <ul className="space-y-1">
        {items.map((p) => (
          <li key={p.dataKey} className="flex items-center justify-between gap-6 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.fill }} />
              {p.name}
              {Number(p.value) < 0 ? ` (${t("charts.credit")})` : ""}
            </span>
            <span className="tabular-nums font-medium text-heading">
              {fmt.formatCurrency(p.value)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-1 border-t border-default pt-1.5 text-[11px]">
        {Number.isFinite(row?.[grossKey]) ? (
          <div className="flex justify-between text-muted">
            <span>{grossLabel}</span>
            <span className="tabular-nums font-medium text-heading">
              {fmt.formatCurrency(row[grossKey])}
            </span>
          </div>
        ) : null}
        {Number.isFinite(row?.[netKey]) ? (
          <div className="flex justify-between font-semibold text-heading">
            <span>{netLabel}</span>
            <span className="tabular-nums">{fmt.formatCurrency(row[netKey])}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
