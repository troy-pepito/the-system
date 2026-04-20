"use client";
import { useState, useEffect } from "react";

interface CheckInCardProps {
  name: string;
  storageKey: string;
  xpPerCheckIn: number;
  onStatChange?: (count: number) => void;
}

export default function CheckInCard({ name, storageKey, xpPerCheckIn, onStatChange }: CheckInCardProps) {
  const [count, setCount] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const savedCount = localStorage.getItem(`${storageKey}_count`);
    const lastCheckIn = localStorage.getItem(`${storageKey}_last`);
    if (savedCount) {
      const parsed = parseInt(savedCount);
      setCount(parsed);
      if (onStatChange) onStatChange(parsed);
    }
    if (lastCheckIn === today) {
      setCheckedInToday(true);
    }
  }, [storageKey, today, onStatChange]);

  function handleCheckIn() {
    const newCount = count + 1;
    setCount(newCount);
    setCheckedInToday(true);
    localStorage.setItem(`${storageKey}_count`, String(newCount));
    localStorage.setItem(`${storageKey}_last`, today);
    if (onStatChange) onStatChange(newCount);
  }

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-4 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{name}</p>
        <p className="text-xs text-cyan-400/60">+{xpPerCheckIn} XP</p>
      </div>
      <p className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] mb-3">
        {count}
      </p>
      {checkedInToday ? (
        <p className="text-xs text-emerald-400/80 uppercase tracking-wider py-2">
          ✓ Done today
        </p>
      ) : (
        <button
          onClick={handleCheckIn}
          className="w-full px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-300 text-xs uppercase tracking-wider hover:bg-cyan-500/30 transition-colors"
        >
          Check In
        </button>
      )}
    </div>
  );
}