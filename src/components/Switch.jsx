/**
 * Compact on/off switch. Knob stays inside the track via overflow-hidden and
 * translate values matched to track width (w-11) and knob size (size-5).
 */
export default function Switch({ checked, onChange, id, "aria-label": ariaLabel }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
        checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
