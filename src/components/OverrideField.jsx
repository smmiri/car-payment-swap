import ModeToggle from "./ModeToggle.jsx";
import InfoTip from "./InfoTip.jsx";

/**
 * Number field with auto/manual mode toggle — same chrome as InputField.
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
    <div className="min-w-0">
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="field-label truncate">{label}</span>
          {help ? <InfoTip text={help} /> : null}
        </div>
        <ModeToggle value={isManual ? "manual" : "auto"} onChange={onModeChange} />
      </div>
      <div className={`control-shell ${!isManual ? "bg-surface-inset" : ""}`}>
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
          className="w-full bg-transparent px-3 text-right text-sm tabular-nums text-heading focus:outline-none disabled:cursor-not-allowed disabled:opacity-80"
        />
        {suffix ? <span className="shrink-0 px-3 text-xs font-medium text-caption">{suffix}</span> : null}
      </div>
      {!isManual && Number.isFinite(computed) ? (
        <p className="field-hint">Auto: {Math.round(computed * 100) / 100}</p>
      ) : (
        <p className="field-hint invisible" aria-hidden>
          &nbsp;
        </p>
      )}
    </div>
  );
}
