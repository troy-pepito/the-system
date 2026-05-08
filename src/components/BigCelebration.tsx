"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CELEBRATION_EVENT,
  type CelebrationDetail,
} from "@/lib/player";

interface QueuedCelebration extends CelebrationDetail {
  id: number;
}

const TONE_STYLE: Record<
  NonNullable<CelebrationDetail["tone"]>,
  { border: string; glow: string; accent: string; halo: string }
> = {
  amber: {
    border: "border-amber-400/70",
    glow: "shadow-[0_0_60px_rgba(251,191,36,0.6),inset_0_0_40px_rgba(251,191,36,0.15)]",
    accent: "text-amber-200 drop-shadow-[0_0_18px_rgba(251,191,36,0.9)]",
    halo: "bg-amber-400/30",
  },
  cyan: {
    border: "border-cyan-400/70",
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.6),inset_0_0_40px_rgba(34,211,238,0.15)]",
    accent: "text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]",
    halo: "bg-cyan-400/30",
  },
  violet: {
    border: "border-violet-400/70",
    glow: "shadow-[0_0_60px_rgba(167,139,250,0.6),inset_0_0_40px_rgba(167,139,250,0.15)]",
    accent: "text-violet-200 drop-shadow-[0_0_18px_rgba(167,139,250,0.9)]",
    halo: "bg-violet-400/30",
  },
  emerald: {
    border: "border-emerald-400/70",
    glow: "shadow-[0_0_60px_rgba(52,211,153,0.6),inset_0_0_40px_rgba(52,211,153,0.15)]",
    accent: "text-emerald-200 drop-shadow-[0_0_18px_rgba(52,211,153,0.9)]",
    halo: "bg-emerald-400/30",
  },
};

let nextId = 1;

export default function BigCelebration() {
  const t = useTranslations();
  const [queue, setQueue] = useState<QueuedCelebration[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CelebrationDetail>).detail;
      if (!detail) return;
      const id = nextId++;
      setQueue((prev) => [...prev, { ...detail, id }]);
      // No auto-dismiss — celebrations linger until the player taps
      // to close. Troy: "our toasts shouldn't be shy".
    };
    window.addEventListener(CELEBRATION_EVENT, handler);
    return () => window.removeEventListener(CELEBRATION_EVENT, handler);
  }, []);

  function dismiss(id: number) {
    setQueue((prev) => prev.filter((x) => x.id !== id));
  }

  if (queue.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[160] pointer-events-none flex items-center justify-center px-4"
      aria-live="polite"
    >
      {queue.map((c) => {
        const tone = TONE_STYLE[c.tone ?? "amber"];
        return (
          <div key={c.id} className="relative">
            <div
              className={`absolute inset-0 rounded-full blur-3xl animate-celebration-halo ${tone.halo}`}
              aria-hidden
            />
            <div
              className={`relative bg-slate-950/95 border-2 ${tone.border} ${tone.glow} px-10 py-6 rounded-lg animate-celebration-pop-in text-center pointer-events-auto`}
            >
              <button
                type="button"
                onClick={() => dismiss(c.id)}
                aria-label="Dismiss"
                className={`absolute -top-3 -right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-950 border-2 ${tone.border} ${tone.accent} text-base leading-none hover:brightness-150 transition-all shadow-lg`}
              >
                ✕
              </button>
              <p
                className={`font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.3em] ${tone.accent}`}
              >
                {t(c.titleKey, c.titleValues)}
              </p>
              {c.subtitleKey && (
                <p className="mt-2 text-[10px] tracking-[0.4em] uppercase text-slate-300">
                  {t(c.subtitleKey, c.subtitleValues)}
                </p>
              )}
              <p
                className={`mt-3 font-mono text-xl font-bold ${tone.accent}`}
              >
                +{c.xp} XP
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
