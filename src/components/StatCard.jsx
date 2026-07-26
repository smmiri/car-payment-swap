import InfoTip from "./InfoTip.jsx";

const VALUE_TONE = {
  positive: "text-emerald-700 dark:text-emerald-400",
  negative: "text-rose-700 dark:text-rose-400",
  primary: "text-indigo-700 dark:text-indigo-300",
};

export default function StatCard({ label, value, sublabel, help, tone = "neutral" }) {
  return (
    <div className="flex min-h-[6.5rem] flex-col gap-1 rounded-2xl border border-default bg-surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="section-label">{label}</span>
        {help ? <InfoTip text={help} /> : null}
      </div>
      <div
        className={`text-xl font-semibold tabular-nums tracking-tight text-heading sm:text-2xl ${
          VALUE_TONE[tone] ?? ""
        }`}
      >
        {value}
      </div>
      <div className="mt-auto min-h-[1rem] text-xs leading-snug text-muted">{sublabel || "\u00A0"}</div>
    </div>
  );
}
