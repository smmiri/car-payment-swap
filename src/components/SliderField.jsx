import InfoTip from "./InfoTip.jsx";

export default function SliderField({ name, value, meta, onChange }) {
  const id = `field-${name}`;
  const min = meta.min ?? 0;
  const max = meta.max ?? 100;
  const step = meta.step ?? 0.1;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const setValue = (v) => onChange(name, clamp(v));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-label">
            {meta.label}
          </label>
          {meta.help ? <InfoTip text={meta.help} /> : null}
        </div>
        <div className="flex items-center rounded-md border input-shell text-sm">
          <input
            type="number"
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              setValue(Number.isFinite(parsed) ? parsed : 0);
            }}
            step={step}
            min={min}
            max={max}
            inputMode="decimal"
            aria-label={`${meta.label} precise value`}
            className="w-16 bg-transparent py-1 pl-2 text-right tabular-nums text-heading focus:outline-none"
          />
          {meta.suffix ? (
            <span className="pr-2 text-xs font-medium text-caption">{meta.suffix}</span>
          ) : null}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full cursor-grab accent-indigo-600"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number.isFinite(value) ? value : min}
        aria-valuetext={`${value}${meta.suffix ?? ""}`}
      />
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-caption">
        <span>
          {min}
          {meta.suffix}
        </span>
        <span>
          {max}
          {meta.suffix}
        </span>
      </div>
    </div>
  );
}
