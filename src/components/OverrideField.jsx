import ModeToggle from "./ModeToggle.jsx";
import InfoTip from "./InfoTip.jsx";

/**
 * Number field with auto/manual mode toggle.
 */
export default function OverrideField({
  label,
  help,
  mode,
  manual,
  computed,
  onModeChange,
  onManualChange,
  suffix = "$",
  step = 1,
  min = 0,
}) {
  const isManual = mode === "manual";
  const display = isManual ? manual : computed;

  return (
    <div className="rounded-md border border-default bg-surface-card px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm font-medium text-label">{label}</span>
          {help ? <InfoTip text={help} /> : null}
          {isManual ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Manual
            </span>
          ) : null}
        </div>
        <ModeToggle value={isManual ? "manual" : "auto"} onChange={onModeChange} />
      </div>
      <div className="flex items-center rounded-md border input-shell">
        <input
          type="number"
          value={Number.isFinite(display) ? display : ""}
          disabled={!isManual}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onManualChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          step={step}
          min={min}
          inputMode="decimal"
          className="w-full bg-transparent px-3 py-2 text-right text-sm tabular-nums text-heading focus:outline-none disabled:opacity-70"
        />
        {suffix ? <span className="px-3 text-xs font-medium text-caption">{suffix}</span> : null}
      </div>
      {!isManual && Number.isFinite(computed) ? (
        <p className="mt-1 text-[11px] text-muted">Auto: {Math.round(computed * 100) / 100}</p>
      ) : null}
    </div>
  );
}
