"use client";
import { useEffect, useState } from "react";
import { LEVEL_UP_EVENT } from "@/lib/player";

interface ActiveLevelUp {
  id: number;
  to: number;
}

let nextId = 1;

/**
 * Small ceremonial moment for each level-up — distinct from rank-up
 * (which gets the fullscreen RankUpCelebration). Top-center bracket
 * toast, lingers ~2.5s, doesn't take over the screen.
 *
 * Suppresses itself when a rank-up also fired this tick — the rank
 * celebration is the bigger moment and the level pop would just talk
 * over it.
 */
export default function LevelUpToast() {
  const [active, setActive] = useState<ActiveLevelUp | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{ from: number; to: number; alsoRankedUp: boolean }>
      ).detail;
      if (!detail || detail.alsoRankedUp) return;
      const change = { id: nextId++, to: detail.to };
      setActive(change);
      setTimeout(() => {
        setActive((prev) => (prev?.id === change.id ? null : prev));
      }, 2500);
    };
    window.addEventListener(LEVEL_UP_EVENT, handler);
    return () => window.removeEventListener(LEVEL_UP_EVENT, handler);
  }, []);

  if (!active) return null;

  return (
    <div
      key={active.id}
      aria-live="polite"
      className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-[170] pointer-events-none animate-fade-in"
    >
      <div className="relative bg-slate-950/85 border border-emerald-400/60 px-6 py-3 shadow-[0_0_20px_rgba(52,211,153,0.45),inset_0_0_14px_rgba(52,211,153,0.08)]">
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-300" />
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-300" />
        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-300" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-300" />

        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-emerald-300/90 text-center mb-1">
          [ Level Up ]
        </p>
        <p className="font-display font-bold text-2xl tracking-widest text-emerald-300 text-center drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]">
          Lv {active.to}
        </p>
      </div>
    </div>
  );
}
