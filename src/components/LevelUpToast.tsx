"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LEVEL_UP_EVENT } from "@/lib/player";

interface ActiveLevelUp {
  id: number;
  to: number;
}

let nextId = 1;

const FADE_MS = 420;

/**
 * Small ceremonial moment for each level-up — distinct from rank-up
 * (which gets the fullscreen RankUpCelebration). Top-center bracket
 * toast, fades in, lingers, fades out.
 *
 * Suppresses itself when a rank-up also fired this tick — the rank
 * celebration is the bigger moment and the level pop would just talk
 * over it.
 */
export default function LevelUpToast() {
  const t = useTranslations("toasts");
  const [active, setActive] = useState<ActiveLevelUp | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{ from: number; to: number; alsoRankedUp: boolean }>
      ).detail;
      if (!detail || detail.alsoRankedUp) return;
      setLeaving(false);
      setActive({ id: nextId++, to: detail.to });
    };
    window.addEventListener(LEVEL_UP_EVENT, handler);
    return () => window.removeEventListener(LEVEL_UP_EVENT, handler);
  }, []);

  // Toast stays until the player taps the dismiss button. No more
  // setTimeout-driven auto-fade — Troy's note "our toasts shouldn't
  // be shy" means the level-up moment lingers as long as it needs to.
  function dismiss() {
    if (!active) return;
    const id = active.id;
    setLeaving(true);
    setTimeout(() => {
      setActive((prev) => (prev?.id === id ? null : prev));
      setLeaving(false);
    }, FADE_MS);
  }

  if (!active) return null;

  return (
    <div
      key={active.id}
      aria-live="polite"
      className={`fixed top-[20vh] left-1/2 -translate-x-1/2 z-[170] pointer-events-none ${
        leaving ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      <div className="relative bg-slate-950/85 border border-emerald-400/60 px-6 py-3 shadow-[0_0_20px_rgba(52,211,153,0.45),inset_0_0_14px_rgba(52,211,153,0.08)]">
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-300" />
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-300" />
        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-300" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-300" />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute -top-3 -right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-slate-950 border border-emerald-400/60 text-emerald-300 text-sm leading-none hover:brightness-150 transition-all shadow-md pointer-events-auto"
        >
          ✕
        </button>

        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-emerald-300/90 text-center mb-1">
          {t("levelUp")}
        </p>
        <p className="font-display font-bold text-2xl tracking-widest text-emerald-300 text-center drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]">
          {t("levelLabel", { level: active.to })}
        </p>
      </div>
    </div>
  );
}
