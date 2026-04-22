"use client";
import { notifyRankUp, notifyReward } from "@/lib/player";

const RANKS = ["E", "D", "C", "B", "A", "S"];

export default function DevTestPanel() {
  if (process.env.NODE_ENV !== "development") return null;

  function fireRankUp() {
    const fromIdx = Math.floor(Math.random() * (RANKS.length - 1));
    notifyRankUp({ from: RANKS[fromIdx], to: RANKS[fromIdx + 1] });
  }

  function fireGain() {
    notifyReward({
      xp: 25,
      body: 2,
      mind: 1,
      energy: 1,
    });
  }

  return (
    <div className="fixed bottom-4 left-4 z-[250] flex flex-col gap-2 font-mono">
      <p className="text-[9px] tracking-[0.3em] uppercase text-rose-400/80">
        [ Dev ]
      </p>
      <button
        onClick={fireRankUp}
        className="px-3 py-1.5 bg-rose-500/15 border border-rose-400/50 text-rose-200 text-[10px] uppercase tracking-[0.25em] hover:bg-rose-500/25 transition-colors"
      >
        ⚡ Rank Glitch
      </button>
      <button
        onClick={fireGain}
        className="px-3 py-1.5 bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 text-[10px] uppercase tracking-[0.25em] hover:bg-cyan-500/25 transition-colors"
      >
        + Gain Pop
      </button>
    </div>
  );
}