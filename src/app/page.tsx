"use client";
import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import StreakCard from "@/components/StreakCard";
import XpBar from "@/components/XpBar";

const RANKS = ["E", "D", "C", "B", "A", "S"];
const XP_PER_LEVEL = 100;
const XP_PER_STREAK_DAY = 10;
const LEVELS_PER_RANK = 10;

function getRank(level: number): string {
  const rankIndex = Math.min(Math.floor(level / LEVELS_PER_RANK), RANKS.length - 1);
  return RANKS[rankIndex];
}

export default function Home() {
  const [streakDays, setStreakDays] = useState(0);
  useEffect(() => {
    const saved = localStorage.getItem("streakStartDate");
    if (saved) {
      const days = Math.floor((Date.now() - new Date(saved).getTime()) / (1000 * 60 * 60 * 24));
      setStreakDays(days);
    }
  }, []);

  const totalXp = streakDays * XP_PER_STREAK_DAY;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const currentXp = totalXp % XP_PER_LEVEL;
  const rank = getRank(level - 1);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Player Status Window
          </p>
          <h1 className="text-5xl font-bold text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] tracking-widest uppercase">
            The System
          </h1>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <div className="bg-slate-900/80 rounded-xl p-6 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <h2 className="text-sm tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Awakening Status
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Rank</p>
              <p className="text-2xl font-bold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">{rank}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Level</p>
              <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">{level}</p>
            </div>
          </div>
        </div>

        <XpBar xp={currentXp} xpToNext={XP_PER_LEVEL} level={level} />

        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard name="NOFAP" value={streakDays} />
            <StatCard name="SPIRITUAL" value={0} />
            <StatCard name="INT" value={0} />
            <StatCard name="FITNESS" value={0} />
          </div>
        </div>

        <StreakCard title="Nofap Streak" onStreakChange={setStreakDays} />
      </div>
    </main>
  );
}
