"use client";
import { useState } from "react";
import { getDungeon } from "@/lib/dungeons";
import {
  computeStreakDays,
  notifyStatsUpdated,
  notifyReward,
  XP_PER_COMPLETION,
} from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import {
  setRunStartDate,
  endRun,
  type DungeonRunState,
} from "@/app/actions/dungeons";
import { track } from "@/lib/analytics";

interface TimedDungeonCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  onStreakChange?: (days: number) => void;
  onRelapse?: () => void;
  onComplete?: () => void;
}

export default function TimedDungeonCard({
  dungeonId,
  initialRun,
  onStreakChange,
  onRelapse,
  onComplete,
}: TimedDungeonCardProps) {
  const dungeon = getDungeon(dungeonId);
  const TIERS = dungeon?.tiers ?? [];
  const TARGET = dungeon?.timed?.targetDays ?? 30;

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [streak, setStreak] = useState(computeStreakDays(initialRun.startDate));

  async function handleDatePick(date: string) {
    await setRunStartDate(dungeonId, date);
    setStartDate(date);
    const days = computeStreakDays(date);
    setStreak(days);
    if (onStreakChange) onStreakChange(days);
    notifyStatsUpdated();
  }

  async function handleClaimVictory() {
    await endRun(dungeonId, "completed");
    notifyReward({ xp: XP_PER_COMPLETION });
    setStartDate(null);
    setStreak(0);
    if (onStreakChange) onStreakChange(0);
    if (onComplete) onComplete();
    notifyStatsUpdated();
  }

  async function handleRelapse() {
    await endRun(dungeonId, "relapse");
    track("relapse", {
      dungeon_id: dungeonId,
      rule_type: "timed",
      streak_days: streak,
    });
    setStartDate(null);
    setStreak(0);
    if (onStreakChange) onStreakChange(0);
    if (onRelapse) onRelapse();
    notifyStatsUpdated();
  }

  const cleared = streak >= TARGET;
  const progressPercent = Math.min(100, Math.round((streak / TARGET) * 100));

  const highestClearedIndex = TIERS.filter((t) => streak >= t.days).length - 1;

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        {dungeon?.name ?? dungeonId}
      </p>
      {startDate ? (
        <div className="space-y-4">
          <div className="py-2">
            <p
              className={`text-4xl font-bold drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] ${
                cleared ? "text-amber-300" : "text-emerald-400"
              }`}
            >
              {streak}
            </p>
            <p className="text-xs text-emerald-400/60 uppercase tracking-wider mt-1">
              {streak === 1 ? "day" : "days"} reclaimed
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {TIERS.map((t, i) => {
              const clearedTier = i <= highestClearedIndex;
              return (
                <span
                  key={t.rank}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-xs font-bold transition-all ${
                    clearedTier
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : "bg-slate-800/50 border-slate-700 text-slate-600"
                  }`}
                >
                  {t.rank}
                </span>
              );
            })}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
              <span>Target: {TARGET} days</span>
              <span>
                {streak} / {TARGET}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  cleared
                    ? "bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    : "bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {cleared && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-amber-300 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse">
                ★ Dungeon Cleared ★
              </p>
              <button
                onClick={handleClaimVictory}
                className="w-full px-4 py-3 bg-amber-500/20 border border-amber-400/50 rounded text-amber-300 text-sm uppercase tracking-widest hover:bg-amber-500/30 transition-colors drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              >
                Claim Victory
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-600">Entered: {startDate}</p>
          <button
            onClick={handleRelapse}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400/70 text-xs uppercase tracking-wider hover:bg-red-500/20 transition-colors"
          >
            Relapse — Reset
          </button>
        </div>
      ) : (
        <div className="space-y-4 py-3">
          <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.4em] text-slate-500 uppercase">
            <span className="inline-block w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse" />
            Portal Dormant
          </div>
          <DateEntryPicker onEnter={handleDatePick} />
        </div>
      )}
    </div>
  );
}