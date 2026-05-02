"use client";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { getDungeon } from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
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

interface StreakCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  onStreakChange?: (days: number) => void;
  onExit?: () => void;
}

export default function StreakCard({
  dungeonId,
  initialRun,
  onStreakChange,
  onExit,
}: StreakCardProps) {
  const tDungeons = useTranslations("dungeons");
  const tRun = useTranslations("dungeonRun");
  const dungeon = getDungeon(dungeonId);
  const dungeonName = dungeon
    ? tDungeons(`${dungeonKey(dungeonId)}.name`)
    : dungeonId;
  const TIERS = dungeon?.tiers ?? [];

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [clearedCount, setClearedCount] = useState(0);

  const journal = useJournalAction({ dungeonId, dungeonName });
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

  const highestClearedIndex =
    TIERS.filter((t) => clearedCount >= t.days).length - 1;
  const nextTier = TIERS[highestClearedIndex + 1] ?? null;
  const prevDays =
    highestClearedIndex >= 0 ? TIERS[highestClearedIndex].days : 0;
  const progressToNext = nextTier
    ? Math.min(
        100,
        Math.round(
          ((clearedCount - prevDays) / (nextTier.days - prevDays)) * 100
        )
      )
    : 100;

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        {dungeonName}
      </p>
      {startDate ? (
        <div className="space-y-4">
          <div className="py-2">
            <p className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
              {clearedCount}
            </p>
            <p className="text-xs text-emerald-400/60 uppercase tracking-wider mt-1">
              {tRun("daysCleared", { count: clearedCount })}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {TIERS.map((t, i) => {
              const cleared = i <= highestClearedIndex;
              const isNext = nextTier !== null && t.rank === nextTier.rank;
              const style = getRankStyle(t.rank);
              return (
                <span
                  key={t.rank}
                  className={`w-8 h-8 flex items-center justify-center rounded border text-xs font-bold transition-all ${
                    cleared
                      ? `${style.bg} ${style.border} ${style.text} ${style.textClass} ${style.glow}`
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
                <span>{tRun("nextTier", { rank: nextTier.rank })}</span>
                <span>
                  {tRun("daysFraction", { count: clearedCount, target: nextTier.days })}
                </span>
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
              {tRun("dungeonMastered")}
            </p>
          )}

          <DungeonCheckInPanel
            dungeonId={dungeonId}
            dungeonName={dungeonName}
            startDate={startDate}
            onClearedCountChange={handleClearedCountChange}
          />

          <p className="text-[10px] text-slate-600">{tRun("entered", { date: startDate })}</p>
          <div className="flex flex-col gap-2 items-stretch">
            <button
              onClick={journal.open}
              className="px-4 py-2 border border-slate-700 rounded text-slate-400 text-[11px] uppercase tracking-[0.3em] hover:text-cyan-200 hover:border-cyan-500/40 transition-colors"
            >
              {tRun("journalEntry")}
            </button>
            <button
              onClick={exitAction.open}
              className="px-4 py-2 border border-slate-700 rounded text-slate-500 text-[11px] uppercase tracking-[0.3em] hover:text-amber-300/80 hover:border-amber-500/30 transition-colors"
            >
              {tRun("exitDungeon")}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-3">
          <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.4em] text-slate-500 uppercase">
            <span className="inline-block w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse" />
            {tRun("portalDormant")}
          </div>
          <DateEntryPicker onEnter={handleDatePick} />
        </div>
      )}

      <NoteModal {...journal.modalProps} />
      <NoteModal {...exitAction.modalProps} />
    </div>
  );
}