"use client";
import { useEffect, useRef, useState } from "react";
import { RANK_UP_EVENT } from "@/lib/player";
import { getRankStyle } from "@/lib/rankStyle";

interface RankChange {
  id: number;
  from: string;
  to: string;
}

let nextId = 1;

/**
 * The formal rank-up announcement — a fullscreen ceremonial overlay
 * that fires alongside RankUpGlitch (the brief system "stutter") and
 * lingers for ~5 seconds. Backdrop dim, bracket headline, the new
 * rank letter rendered massive in its material vocabulary (bronze →
 * holographic), and a "from → to" line beneath. Tap-to-dismiss or
 * auto-dismiss after 5s.
 *
 * Design decision: shown after a 700ms delay so the glitch effect
 * lands first as a system disturbance, then the celebration takes
 * over as the formal announcement. Layered moments, not competing.
 */
export default function RankUpCelebration() {
  const [active, setActive] = useState<RankChange | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ from: string; to: string }>).detail;
      if (!detail) return;
      const change = { id: nextId++, from: detail.from, to: detail.to };
      // Let the glitch effect breathe first.
      setTimeout(() => {
        setActive(change);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
          setActive((prev) => (prev?.id === change.id ? null : prev));
        }, 5000);
      }, 700);
    };
    window.addEventListener(RANK_UP_EVENT, handler);
    return () => {
      window.removeEventListener(RANK_UP_EVENT, handler);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  function dismiss() {
    setActive(null);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }

  if (!active) return null;

  const toStyle = getRankStyle(active.to);
  const fromStyle = getRankStyle(active.from);

  return (
    <div
      key={active.id}
      role="dialog"
      aria-live="polite"
      onClick={dismiss}
      className="fixed inset-0 z-[280] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm cursor-pointer animate-fade-in"
    >
      <div className="relative w-[min(92vw,28rem)] px-6 py-10 text-center">
        {/* Corner brackets — same motif as the hunter ID frame */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-300" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-300" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-300" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-300" />

        <p className="font-display text-[10px] sm:text-xs tracking-[0.6em] uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] mb-5">
          [ Rank Ascended ]
        </p>

        <p
          className={`font-display font-bold text-[8rem] sm:text-[10rem] leading-none tracking-widest ${toStyle.text} ${toStyle.textClass} ${toStyle.glow}`}
        >
          {active.to}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 text-2xl font-display font-bold tracking-widest">
          <span
            className={`${fromStyle.text} ${fromStyle.textClass} opacity-50`}
          >
            {active.from}
          </span>
          <span className="text-slate-500 text-base">→</span>
          <span
            className={`${toStyle.text} ${toStyle.textClass} ${toStyle.glow}`}
          >
            {active.to}
          </span>
        </div>

        <p className="mt-6 text-[10px] text-slate-500 tracking-[0.4em] uppercase">
          {toStyle.flavor} tier achieved
        </p>
        <p className="mt-2 text-[9px] text-slate-600 tracking-[0.3em] uppercase">
          Tap to dismiss
        </p>
      </div>
    </div>
  );
}
