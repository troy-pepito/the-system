"use client";
import { useEffect, useState } from "react";
import { submitBugReport } from "@/app/actions/feedback";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Auto-dismiss success after a beat.
  useEffect(() => {
    if (status.kind !== "success") return;
    const t = setTimeout(() => closeModal(), 2200);
    return () => clearTimeout(t);
  }, [status]);

  function openModal() {
    setStatus({ kind: "idle" });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setDescription("");
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind === "submitting") return;
    const trimmed = description.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: "Tell us what went wrong." });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const result = await submitBugReport({
        description: trimmed,
        contextUrl:
          typeof window !== "undefined" ? window.location.href : "",
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      if (result.ok) {
        setStatus({ kind: "success" });
      } else {
        setStatus({ kind: "error", message: result.error ?? "Failed." });
      }
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="hover:text-cyan-300 transition-colors uppercase tracking-[0.4em]"
      >
        Report a Bug
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-black/85 backdrop-blur-sm"
          onClick={(e) => {
            // Click on backdrop (not on the modal card) closes.
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative max-w-md w-full mx-auto">
            <div className="absolute -inset-px border border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.4),inset_0_0_20px_rgba(34,211,238,0.1)] pointer-events-none" />
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />

            <form
              onSubmit={handleSubmit}
              className="relative bg-slate-950/95 p-8 sm:p-10 font-mono space-y-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[10px] tracking-[0.5em] uppercase text-cyan-400/80 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                  [ Report a Bug ]
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-[10px] tracking-[0.3em] uppercase text-slate-500 hover:text-cyan-300 transition-colors"
                >
                  Close
                </button>
              </div>

              {status.kind === "success" ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm tracking-widest text-cyan-200">
                    Report sent. Thanks, hunter.
                  </p>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-slate-500">
                    A human will read this.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs tracking-wider text-slate-400 leading-relaxed">
                    Describe what happened, what you expected, and what you saw
                    instead. The more detail the better — date, dungeon, action,
                    anything. We&apos;ll get the URL and your hunter ID
                    automatically.
                  </p>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={status.kind === "submitting"}
                    maxLength={5000}
                    rows={6}
                    placeholder="Something broke when I…"
                    className="w-full bg-slate-900/60 border border-slate-700 focus:border-cyan-400/70 focus:outline-none p-3 text-sm text-cyan-100 placeholder-slate-600 tracking-wide resize-y transition-colors disabled:opacity-50"
                    autoFocus
                  />

                  {status.kind === "error" && (
                    <p className="text-[11px] tracking-wider text-red-400">
                      {status.message}
                    </p>
                  )}

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={status.kind === "submitting"}
                      className="px-5 py-2 border border-slate-700 text-slate-400 text-[10px] uppercase tracking-[0.3em] hover:border-slate-500 hover:text-slate-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        status.kind === "submitting" || !description.trim()
                      }
                      className="px-5 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500/40 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                      {status.kind === "submitting" ? "Sending…" : "Send"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
