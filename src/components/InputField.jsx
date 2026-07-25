import InfoTip from "./InfoTip.jsx";

export default function InputField({ name, value, meta, onChange, disabled = false, hint }) {
  const id = `field-${name}`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-label">
          {meta.label}
        </label>
        {meta.help ? <InfoTip text={meta.help} /> : null}
      </div>
      <div
        className={`flex items-center rounded-md border input-shell ${
          disabled ? "bg-surface-inset opacity-80" : ""
        }`}
      >
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
          className="w-full bg-transparent px-3 py-2 text-right text-sm tabular-nums text-heading focus:outline-none disabled:cursor-not-allowed"
        />
        {meta.suffix ? (
          <span className="px-3 text-xs font-medium text-caption">{meta.suffix}</span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
