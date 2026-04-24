"use client";
import { useState } from "react";
import { getDungeon } from "@/lib/dungeons";
import {
  computeStreakDays,
  notifyStatsUpdated,
  beginMutation,
  endMutation,
} from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import {
  setRunStartDate,
  logAllowanceEvent,
  type DungeonRunState,
} from "@/app/actions/dungeons";
import { track } from "@/lib/analytics";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import {
  bumpAllowanceInCache,
  endRunInCache,
} from "@/lib/dashboardCacheOps";

interface AllowanceDungeonCardProps {
  dungeonId: string;
  eventType?: string;
  initialRun: DungeonRunState;
  initialMonthCount: number;
  onStreakChange?: (days: number) => void;
  onRelapse?: () => void;
}

export default function AllowanceDungeonCard({
  dungeonId,
  eventType = "consume",
  initialRun,
  initialMonthCount,
  onStreakChange,
  onRelapse,
}: AllowanceDungeonCardProps) {
  const dungeon = getDungeon(dungeonId);
  const TIERS = dungeon?.tiers ?? [];
  const allowance = dungeon?.allowance;
  const LIMIT = allowance?.limit ?? 0;
  const unit = allowance?.unitLabel ?? "unit";
  const unitPlural = allowance?.unitLabelPlural ?? "units";

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [streak, setStreak] = useState(computeStreakDays(initialRun.startDate));
  const [monthCount, setMonthCount] = useState(initialMonthCount);

  async function handleDatePick(date: string) {
    await setRunStartDate(dungeonId, date);
    setStartDate(date);
    const days = computeStreakDays(date);
    setStreak(days);
    if (onStreakChange) onStreakChange(days);
    notifyStatsUpdated();
  }

  async function handleLog() {
    const nextCount = monthCount + 1;
    const willRelapse = nextCount > LIMIT;

    setMonthCount(nextCount);
    bumpAllowanceInCache(dungeonId, 1);

    if (willRelapse) {
      track("relapse", {
        dungeon_id: dungeonId,
        rule_type: "allowance",
        streak_days: streak,
        month_count: nextCount,
      });
      setStartDate(null);
      setStreak(0);
      endRunInCache(dungeonId);
      if (onStreakChange) onStreakChange(0);
      if (onRelapse) onRelapse();
    }

    beginMutation();
    try {
      const { count } = await logAllowanceEvent(dungeonId, eventType);
      setMonthCount(count);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:logAllowance",
        dungeonId,
        eventType,
      });
      drainQueue().catch(() => {});
    } finally {
      endMutation();
    }
  }

  const highestClearedIndex = TIERS.filter((t) => streak >= t.days).length - 1;
  const nextTier = TIERS[highestClearedIndex + 1] ?? null;
  const prevDays = highestClearedIndex >= 0 ? TIERS[highestClearedIndex].days : 0;
  const progressToNext = nextTier
    ? Math.min(100, Math.round(((streak - prevDays) / (nextTier.days - prevDays)) * 100))
    : 100;

  const atLimit = monthCount >= LIMIT;
  const remaining = Math.max(0, LIMIT - monthCount);

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        {dungeon?.name ?? dungeonId}
      </p>
      {startDate ? (
        <div className="space-y-4">
          <div className="py-2">
            <p className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
              {streak}
            </p>
            <p className="text-xs text-emerald-400/60 uppercase tracking-wider mt-1">
              {streak === 1 ? "day" : "days"} strong
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {TIERS.map((t, i) => {
              const cleared = i <= highestClearedIndex;
              const isNext = nextTier !== null && t.rank === nextTier.rank;
              return (
                <span
                  key={t.rank}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-xs font-bold transition-all ${
                    cleared
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : isNext
                      ? "bg-cyan-500/10 border-cyan-400/60 text-cyan-300 animate-pulse"
                      : "bg-slate-800/50 border-slate-700 text-slate-600"
                  }`}
                >
                  {t.rank}
                </span>
              );
            })}
          </div>

          {nextTier ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                <span>Next tier: {nextTier.rank}</span>
                <span>{streak} / {nextTier.days} days</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-300 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              Dungeon mastered
            </p>
          )}

          <div className="border border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-xs uppercase tracking-wider">
              <span className="text-slate-500">This month</span>
              <span
                className={
                  atLimit
                    ? "text-red-400 font-bold"
                    : "text-cyan-300 font-bold"
                }
              >
                {monthCount} / {LIMIT} {monthCount === 1 ? unit : unitPlural}
              </span>
            </div>
            {!atLimit && (
              <p className="text-[10px] text-slate-500">
                {remaining} {remaining === 1 ? unit : unitPlural} remaining this month
              </p>
            )}
            {atLimit && (
              <p className="text-[10px] text-red-400/80 uppercase tracking-wider">
                ⚠ Logging another {unit} will relapse the run
              </p>
            )}
            <button
              onClick={handleLog}
              className={`w-full px-4 py-2 rounded text-xs uppercase tracking-wider transition-colors ${
                atLimit
                  ? "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20"
                  : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
              }`}
            >
              {atLimit ? `Log ${unit} (Relapse)` : `+ Log ${unit}`}
            </button>
          </div>

          <p className="text-[10px] text-slate-600">Entered: {startDate}</p>
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