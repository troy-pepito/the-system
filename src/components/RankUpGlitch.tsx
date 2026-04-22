"use client";
import { useEffect, useState } from "react";
import { RANK_UP_EVENT } from "@/lib/player";

interface RankChange {
  id: number;
  from: string;
  to: string;
}

let nextId = 1;

export default function RankUpGlitch() {
  const [active, setActive] = useState<RankChange | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ from: string; to: string }>).detail;
      if (!detail) return;
      setActive({ id: nextId++, from: detail.from, to: detail.to });
      setTimeout(() => setActive(null), 1400);
    };
    window.addEventListener(RANK_UP_EVENT, handler);
    return () => window.removeEventListener(RANK_UP_EVENT, handler);
  }, []);

  if (!active) return null;

  return (
    <div
      key={active.id}
      aria-live="polite"
      className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-cyan-500/5 animate-rank-tear" />
      <div className="relative animate-rank-glitch text-center">
        <p className="font-display text-[10px] tracking-[0.6em] uppercase text-cyan-400/90 mb-3 drop-shadow-[0_0_14px_rgba(34,211,238,0.9)]">
          [ Rank Ascended ]
        </p>
        <p className="font-display font-bold text-6xl sm:text-7xl text-aberration text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)] tracking-widest">
          {active.from} → {active.to}
        </p>
      </div>
    </div>
  );
}