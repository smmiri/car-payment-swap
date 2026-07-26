export default function FieldGroup({ title, children, cols = 2 }) {
  const grid =
    cols === 3
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2";

  return (
    <div className="space-y-3">
      {title ? <h4 className="section-label">{title}</h4> : null}
      <div className={grid}>{children}</div>
    </div>
  );
}
