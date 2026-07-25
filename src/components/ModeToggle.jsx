export default function ModeToggle({ value, onChange, autoLabel = "Auto", manualLabel = "Manual" }) {
  return (
    <div role="tablist" className="inline-flex shrink-0 rounded-md border border-default bg-surface-card p-0.5 text-xs">
      {[
        ["auto", autoLabel],
        ["manual", manualLabel],
      ].map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`rounded px-2 py-1 transition-colors ${
            value === v ? "bg-indigo-600 text-white" : "tab-inactive"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
