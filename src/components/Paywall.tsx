"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createCheckoutUrl } from "@/app/actions/checkout";

interface PaywallProps {
  open: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  "Unlimited active dungeons",
  "Streak Insurance — one relapse forgiven per month",
  "VIP cosmetic frame + badge",
  "Whole-app theme packs",
  "Lifetime analytics — full history, data export",
];

export default function Paywall({ open, onClose }: PaywallProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleAscend() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckoutUrl();
      if (!url) {
        setError("Checkout is not configured yet.");
        setLoading(false);
        return;
      }
      window.location.href = url;
    } catch {
      setError("Could not open checkout. Try again in a moment.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400 z-10 pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400 z-10 pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400 z-10 pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400 z-10 pointer-events-none" />
        <div className="relative bg-slate-950/95 border border-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.25),inset_0_0_20px_rgba(251,191,36,0.05)] p-8">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 text-sm"
          >
            ✕
          </button>
          <p className="text-[10px] tracking-[0.5em] uppercase text-amber-400/80 mb-3 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
            [ Gate Locked ]
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-amber-200 mb-4">
            Ascend to Pro
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Your third gate is Pro. Two active dungeons is the free tier — past
            that, you&apos;re in hunter territory.
          </p>
          <ul className="space-y-2.5 mb-7">
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                className="flex gap-3 text-sm text-slate-200 leading-relaxed"
              >
                <span className="text-amber-400/80 mt-1 shrink-0">◆</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleAscend}
            disabled={loading}
            className="w-full px-6 py-3 bg-amber-500/25 border border-amber-400 text-amber-100 text-xs uppercase tracking-[0.4em] hover:bg-amber-500/40 hover:text-white active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(251,191,36,0.45)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Opening Checkout…" : "Ascend"}
          </button>
          {error && (
            <p className="text-[11px] text-rose-400 tracking-wider mt-3 text-center">
              {error}
            </p>
          )}
          <button
            onClick={onClose}
            className="block w-full mt-4 text-[10px] tracking-[0.3em] uppercase text-slate-500 hover:text-slate-300 transition-colors"
          >
            Return to free tier
          </button>
        </div>
      </div>
    </div>
  );
}