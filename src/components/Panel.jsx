export default function Panel({ title, children, action }) {
  return (
    <section className="panel-shell">
      <header className="panel-header flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}
