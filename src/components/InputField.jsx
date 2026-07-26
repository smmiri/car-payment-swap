import InfoTip from "./InfoTip.jsx";

export default function InputField({ name, value, meta, onChange, disabled = false, hint }) {
  const id = `field-${name}`;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={id} className="field-label">
          {meta.label}
        </label>
        {meta.help ? <InfoTip text={meta.help} /> : null}
      </div>
      <div className={`control-shell ${disabled ? "bg-surface-inset opacity-80" : ""}`}>
        <input
          id={id}
          name={name}
          type="number"
          value={Number.isFinite(value) ? value : ""}
          disabled={disabled}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(name, Number.isFinite(parsed) ? parsed : 0);
          }}
          step={meta.step ?? 1}
          min={meta.min}
          max={meta.max}
          inputMode="decimal"
          className="w-full bg-transparent px-3 text-right text-sm tabular-nums text-heading focus:outline-none disabled:cursor-not-allowed"
        />
        {meta.suffix ? (
          <span className="shrink-0 px-3 text-xs font-medium text-caption">{meta.suffix}</span>
        ) : null}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
