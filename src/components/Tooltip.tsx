"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface TooltipProps {
  /** Text shown when the tooltip is open. */
  content: string;
  /** The trigger element. Becomes a button so it's tap- and keyboard-accessible. */
  children: ReactNode;
  /** Optional className applied to the inline-flex wrapper. */
  className?: string;
}

/**
 * Click-to-toggle tooltip that works on both desktop and mobile. Native
 * `title=` attributes only fire on hover, which means mobile users
 * never see them — replacing those with this component lets the same
 * content surface on tap.
 *
 * Click outside dismisses. Click on the trigger again toggles closed.
 * The tooltip sits below the trigger; if your trigger is near the
 * bottom of the viewport, callers can flip with the `above` prop later
 * if needed (not currently implemented — only used near top of cards).
 */
export default function Tooltip({
  content,
  children,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // pointerdown fires before click and works for touch + mouse uniformly.
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        className="inline-flex items-center cursor-help select-none"
      >
        {children}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 px-2.5 py-1.5 bg-slate-900/95 border border-slate-700 rounded-sm text-[10px] text-slate-200 tracking-normal normal-case max-w-[220px] shadow-[0_4px_20px_rgba(0,0,0,0.5)] pointer-events-none whitespace-normal leading-snug"
        >
          {content}
        </span>
      )}
    </span>
  );
}
