"use client";
import { useCallback, useState } from "react";
import { getDungeon } from "@/lib/dungeons";
import { notifyStatsUpdated } from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import { type DungeonRunState } from "@/app/actions/dungeons";
import {
  endRunInCache,
  setRunStartDateInCache,
} from "@/lib/dashboardCacheOps";
import {
  commitSetStartDate,
  useEndRunAction,
  useJournalAction,
} from "@/lib/dungeonActions";
import { getRankStyle } from "@/lib/rankStyle";
import NoteModal from "@/components/NoteModal";
import DungeonCheckInPanel from "@/components/DungeonCheckInPanel";

interface TimedDungeonCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  onStreakChange?: (days: number) => void;
  onExit?: () => void;
  onComplete?: () => void;
}

export default function TimedDungeonCard({
  dungeonId,
  initialRun,
  onStreakChange,
  onExit,
  onComplete,
}: TimedDungeonCardProps) {
  const dungeon = getDungeon(dungeonId);
  const dungeonName = dungeon?.name ?? dungeonId;
  const TIERS = dungeon?.tiers ?? [];
  const TARGET = dungeon?.timed?.targetDays ?? 30;

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [clearedCount, setClearedCount] = useState(0);

  const journal = useJournalAction({ dungeonId, dungeonName });
  const victory = useEndRunAction({
    dungeonId,
    dungeonName,
    reason: "completed",
    onLocalReset: () => {
      setStartDate(null);
      setClearedCount(0);
      endRunInCache(dungeonId);
      onStreakChange?.(0);
      onComplete?.();
    },
  });
  const exitAction = useEndRunAction({
    dungeonId,
    dungeonName,
    reason: "exited",
    onLocalReset: () => {
      setStartDate(null);
      setClearedCount(0);
      endRunInCache(dungeonId);
      onStreakChange?.(0);
      onExit?.();
    },
  });

  const handleClearedCountChange = useCallback(
    (count: number) => {
      setClearedCount(count);
      onStreakChange?.(count);
    },
    [onStreakChange]
  );

  async function handleDatePick(date: string) {
    setStartDate(date);
    setClearedCount(0);
    setRunStartDateInCache(dungeonId, date);
    onStreakChange?.(0);
    notifyStatsUpdated();
    await commitSetStartDate(dungeonId, date);
  }

  const cleared = clearedCount >= TARGET;
  const progressPercent = Math.min(
    100,
    Math.round((clearedCount / TARGET) * 100)
  );
  const highestClearedIndex =
    TIERS.filter((t) => clearedCount >= t.days).length - 1;

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        {dungeonName}
      </p>
      {startDate ? (
        <div className="space-y-4">
          <div className="py-2">
            <p
              className={`text-4xl font-bold drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] ${
                cleared ? "text-amber-300" : "text-emerald-400"
              }`}
            >
              {clearedCount}
            </p>
            <p className="text-xs text-emerald-400/60 uppercase tracking-wider mt-1">
              {clearedCount === 1 ? "day" : "days"} cleared
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {TIERS.map((t, i) => {
              const clearedTier = i <= highestClearedIndex;
              const style = getRankStyle(t.rank);
              return (
                <span
                  key={t.rank}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-xs font-bold transition-all ${
                    clearedTier
                      ? `${style.bg} ${style.border} ${style.text} ${style.textClass} ${style.glow}`
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
                {clearedCount} / {TARGET}
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
                onClick={victory.open}
                className="w-full px-4 py-3 bg-amber-500/20 border border-amber-400/50 rounded text-amber-300 text-sm uppercase tracking-widest hover:bg-amber-500/30 transition-colors drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              >
                Claim Victory
              </button>
            </div>
          )}

          <DungeonCheckInPanel
            dungeonId={dungeonId}
            dungeonName={dungeonName}
            startDate={startDate}
            onClearedCountChange={handleClearedCountChange}
          />

          <p className="text-[10px] text-slate-600">Entered: {startDate}</p>
          <div className="flex flex-col gap-2 items-stretch">
            <button
              onClick={journal.open}
              className="px-4 py-2 border border-slate-700 rounded text-slate-400 text-[11px] uppercase tracking-[0.3em] hover:text-cyan-200 hover:border-cyan-500/40 transition-colors"
            >
              + Journal Entry
            </button>
            <button
              onClick={exitAction.open}
              className="px-4 py-2 border border-slate-700 rounded text-slate-500 text-[11px] uppercase tracking-[0.3em] hover:text-amber-300/80 hover:border-amber-500/30 transition-colors"
            >
              Exit Dungeon
            </button>
          </div>
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

      <NoteModal {...victory.modalProps} />
      <NoteModal {...exitAction.modalProps} />
      <NoteModal {...journal.modalProps} />
    </div>
  );
}