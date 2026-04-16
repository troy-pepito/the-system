"use client";
import { useState, useEffect } from "react";

interface StreakCardProps {
  title: string;
  onStreakChange?: (days: number) => void;
}

export default function StreakCard({ title, onStreakChange }: StreakCardProps) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [pendingDate, setPendingDate] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("streakStartDate");
    if (saved) {
      setStartDate(saved);
      const days = Math.floor(
        (Date.now() - new Date(saved).getTime()) / (1000 * 60 * 60 * 24)
      );
      setStreak(days);
      if (onStreakChange) onStreakChange(days);
    }
  }, [onStreakChange]);

  function handleDatePick(date: string) {
    localStorage.setItem("streakStartDate", date);
    setStartDate(date);
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    setStreak(days);
    if (onStreakChange) onStreakChange(days);
  }

  function handleRelapse() {
    localStorage.removeItem("streakStartDate");
    setStartDate(null);
    setStreak(0);
    if (onStreakChange) onStreakChange(0);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        {title}
      </p>
      {startDate ? (
        <div className="space-y-3">
          <div className="py-2">
            <p className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
              {streak}
            </p>
            <p className="text-xs text-emerald-400/60 uppercase tracking-wider mt-1">
              {streak === 1 ? "day" : "days"} strong
            </p>
          </div>
          <p className="text-xs text-slate-600">Started: {startDate}</p>
          <button
            onClick={handleRelapse}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400/70 text-xs uppercase tracking-wider hover:bg-red-500/20 transition-colors"
          >
            Relapse — Reset
          </button>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-600">When did you start?</p>
          <input
            type="date"
            max={today}
            value={pendingDate}
            onChange={(e) => setPendingDate(e.target.value)}
            className="bg-slate-800 border border-cyan-500/30 rounded px-3 py-2 text-cyan-300 text-sm focus:outline-none focus:border-cyan-500/60"
          />
          {pendingDate && (
            <button
              onClick={() => handleDatePick(pendingDate)}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-300 text-sm uppercase tracking-wider hover:bg-cyan-500/30 transition-colors"
            >
              Confirm
            </button>
          )}
        </div>
      )}
    </div>
  );
}