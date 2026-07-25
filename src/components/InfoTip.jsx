import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TIP_WIDTH = 256;
const TIP_GAP = 6;
const VIEWPORT_PAD = 8;
const HIDE_DELAY_MS = 120;

export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const hideTimerRef = useRef(null);
  const tipId = useId();

  const show = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setOpen(true);
  };

  const hide = () => {
    hideTimerRef.current = window.setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  };

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let left = rect.left + rect.width / 2 - TIP_WIDTH / 2;
      left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - TIP_WIDTH - VIEWPORT_PAD));
      setPosition({ top: rect.bottom + TIP_GAP, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const tooltip =
    open && typeof document !== "undefined"
      ? createPortal(
          <span
            id={tipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: TIP_WIDTH,
            }}
            className="z-[200] rounded-md border border-default bg-surface-card p-3 text-xs leading-relaxed text-body shadow-lg dark:shadow-black/50"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {text}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span className="inline-flex shrink-0">
        <button
          ref={buttonRef}
          type="button"
          aria-describedby={open ? tipId : undefined}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-default text-[10px] font-semibold text-muted hover:border-slate-500 hover:text-label focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:border-slate-400"
        >
          i
        </button>
      </span>
      {tooltip}
    </>
  );
}
