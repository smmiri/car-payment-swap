export default function ModeToggle({ value, onChange, autoLabel = "Auto", manualLabel = "Manual" }) {
  return (
    <div
      role="tablist"
      className="inline-flex shrink-0 rounded-md border border-default bg-surface-inset p-0.5 text-[10px]"
    >
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
          className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
            value === v ? "bg-indigo-600 text-white shadow-sm" : "tab-inactive"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
