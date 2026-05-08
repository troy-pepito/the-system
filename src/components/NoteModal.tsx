"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface NoteModalProps {
  open: boolean;
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  skipLabel?: string;
  onSubmit: (note: string | null, isPublic?: boolean) => void;
  onCancel?: () => void;
  tone?: "neutral" | "danger";
  /**
   * When true, the "skip" button calls onCancel instead of onSubmit(null).
   * Use for destructive actions where the secondary button should mean
   * "abort", not "do the action without writing about it."
   */
  cancelOnSkip?: boolean;
  /**
   * When true, renders a "Share to public profile" checkbox below the
   * textarea. The chosen value is passed to onSubmit as the second arg.
   */
  showPublicToggle?: boolean;
  /** Pre-fills the textarea — used by the journal edit flow. */
  initialNote?: string;
  /** Pre-checks the public toggle when showPublicToggle is true. */
  initialIsPublic?: boolean;
}

export default function NoteModal(props: NoteModalProps) {
  if (!props.open) return null;
  if (typeof document === "undefined") return null;
  return createPortal(<NoteModalInner {...props} />, document.body);
}

function NoteModalInner({
  title,
  placeholder,
  confirmLabel,
  skipLabel,
  onSubmit,
  onCancel,
  tone = "neutral",
  cancelOnSkip = false,
  showPublicToggle = false,
  initialNote = "",
  initialIsPublic = false,
}: NoteModalProps) {
  const t = useTranslations("noteModal");
  const [note, setNote] = useState(initialNote);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const resolvedPlaceholder = placeholder ?? t("defaultPlaceholder");
  const resolvedConfirm = confirmLabel ?? t("defaultConfirm");
  const resolvedSkip = skipLabel ?? t("defaultSkip");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const cancel = onCancel ?? (() => onSubmit(null));

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      taRef.current?.focus({ preventScroll: true })
    );
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handler);
    };
  }, [cancel]);

  const confirmClass =
    tone === "danger"
      ? "bg-red-500/20 border-red-400/60 text-red-200 hover:bg-red-500/30"
      : "bg-cyan-500/20 border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/30";

  function submit() {
    const trimmed = note.trim();
    onSubmit(
      trimmed.length > 0 ? trimmed : null,
      showPublicToggle ? isPublic : undefined
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={cancel}
    >
      <div
        className="relative w-full max-w-md bg-slate-900/95 border border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.25)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

        <button
          type="button"
          onClick={cancel}
          aria-label="Close"
          className="absolute -top-2.5 -right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-950 border border-cyan-400/60 text-cyan-300 text-sm leading-none hover:brightness-150 transition-all shadow-md"
        >
          ✕
        </button>

        <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-2">
          {t("chrome")}
        </p>
        <p className="text-sm text-cyan-100 uppercase tracking-wider mb-4">
          {title}
        </p>

        <textarea
          ref={taRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={resolvedPlaceholder}
          maxLength={2000}
          rows={5}
          className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-400/60 focus:outline-none text-sm text-slate-200 p-3 resize-none placeholder:text-slate-600 tracking-wide leading-relaxed"
        />

        {showPublicToggle && (
          <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] tracking-[0.25em] uppercase text-slate-400">
              {t("sharePublic")}
            </span>
          </label>
        )}

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() =>
              cancelOnSkip ? onCancel?.() : onSubmit(null)
            }
            className="px-4 py-2 border border-slate-700 text-slate-400 text-xs uppercase tracking-[0.3em] hover:bg-slate-800/60 transition-colors"
          >
            {resolvedSkip}
          </button>
          <button
            type="button"
            onClick={submit}
            className={`px-4 py-2 border text-xs uppercase tracking-[0.3em] transition-colors ${confirmClass}`}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}