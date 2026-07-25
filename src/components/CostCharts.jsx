import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useFormat } from "../hooks/useFormat.js";

export default function CostCharts({ results }) {
  const { t } = useTranslation();
  const fmt = useFormat();

  const breakdown = (results.scenarios || []).map((s) => ({
    name: s.name,
    loan: Math.round(s.loanMonthly),
    insurance: Math.round(s.insurance),
    mo: Math.round(s.mo),
    fuel: Math.round(s.fuel),
  }));

  const savings = (results.scenarios || []).map((s) => ({
    name: s.name,
    savings: Math.round(s.vsCurrent),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title={t("calculator.chartBreakdown")}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={breakdown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => fmt.formatCurrency(v)} />
            <Legend />
            <Bar dataKey="loan" stackId="a" fill="#2563eb" name="Loan" />
            <Bar dataKey="insurance" stackId="a" fill="#7c3aed" name="Insurance" />
            <Bar dataKey="mo" stackId="a" fill="#0891b2" name="M&O" />
            <Bar dataKey="fuel" stackId="a" fill="#059669" name="Fuel/elec" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("calculator.chartSavings")}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={savings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => fmt.formatCurrency(v)} />
            <Bar
              dataKey="savings"
              name="Savings"
              fill="#059669"
              // recharts doesn't support per-bar easily without Cell; solid green is fine
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-default bg-surface-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-heading">{title}</h3>
      {children}
    </div>
  );
}
