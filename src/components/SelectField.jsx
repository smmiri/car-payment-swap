export default function SelectField({ label, value, onChange, options, help }) {
  const id = `select-${String(label).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {help ? <span className="sr-only">{help}</span> : null}
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
