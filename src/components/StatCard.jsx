import InfoTip from "./InfoTip.jsx";

const TONE_STYLES = {
  neutral: "border-default bg-surface-card",
  primary: "border-indigo-100 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40",
  buy: "border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
  rent: "border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  positive: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50",
  negative: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
};

const VALUE_TONE = {
  positive: "text-emerald-700 dark:text-emerald-400",
  negative: "text-rose-700 dark:text-rose-400",
};

export default function StatCard({ label, value, sublabel, help, tone = "neutral" }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 ${TONE_STYLES[tone] ?? TONE_STYLES.neutral}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        {help ? <InfoTip text={help} /> : null}
      </div>
      <div className={`text-2xl font-semibold tabular-nums tracking-tight text-heading ${VALUE_TONE[tone] ?? ""}`}>
        {value}
      </div>
      {sublabel ? <div className="text-xs text-muted">{sublabel}</div> : null}
    </div>
  );
}
