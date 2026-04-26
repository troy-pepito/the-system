"use client";
import { useState } from "react";
import { getDungeon } from "@/lib/dungeons";
import { computeStreakDays, notifyStatsUpdated } from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import {
  setRunStartDate,
  endRun,
  logJournalEntry,
  type DungeonRunState,
} from "@/app/actions/dungeons";
import { track } from "@/lib/analytics";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import {
  endRunInCache,
  setRunStartDateInCache,
} from "@/lib/dashboardCacheOps";
import NoteModal from "@/components/NoteModal";

interface StreakCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  onStreakChange?: (days: number) => void;
  onRelapse?: () => void;
}

export default function StreakCard({
  dungeonId,
  initialRun,
  onStreakChange,
  onRelapse,
}: StreakCardProps) {
  const dungeon = getDungeon(dungeonId);
  const TIERS = dungeon?.tiers ?? [];

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [streak, setStreak] = useState(computeStreakDays(initialRun.startDate));
  const [relapseModalOpen, setRelapseModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  async function handleJournal(note: string | null, isPublic?: boolean) {
    setJournalModalOpen(false);
    if (!note) return;
    try {
      await logJournalEntry(dungeonId, note, isPublic ?? false);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:journalLog",
        dungeonId,
        note,
        isPublic: isPublic ?? false,
      });
      drainQueue().catch(() => {});
    }
  }

  async function handleDatePick(date: string) {
    setStartDate(date);
    const days = computeStreakDays(date);
    setStreak(days);
    setRunStartDateInCache(dungeonId, date);
    if (onStreakChange) onStreakChange(days);
    notifyStatsUpdated();

    try {
      await setRunStartDate(dungeonId, date);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:setStartDate",
        dungeonId,
        dateIso: date,
      });
      drainQueue().catch(() => {});
    }
  }

  async function handleRelapse(note: string | null, isPublic?: boolean) {
    setRelapseModalOpen(false);
    track("relapse", {
      dungeon_id: dungeonId,
      rule_type: "continuous_streak",
      streak_days: streak,
    });
    setStartDate(null);
    setStreak(0);
    endRunInCache(dungeonId);
    if (onStreakChange) onStreakChange(0);
    if (onRelapse) onRelapse();
    notifyStatsUpdated();

    try {
      await endRun(dungeonId, "relapse", note ?? undefined, isPublic ?? false);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:endRun",
        dungeonId,
        reason: "relapse",
        ...(note ? { note, isPublic: isPublic ?? false } : {}),
      });
      drainQueue().catch(() => {});
    }
  }

  const highestClearedIndex = TIERS.filter((t) => streak >= t.days).length - 1;
  const nextTier = TIERS[highestClearedIndex + 1] ?? null;
  const prevDays = highestClearedIndex >= 0 ? TIERS[highestClearedIndex].days : 0;
  const progressToNext = nextTier
    ? Math.min(100, Math.round(((streak - prevDays) / (nextTier.days - prevDays)) * 100))
    : 100;

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

          <p className="text-[10px] text-slate-600">Entered: {startDate}</p>
          <div className="flex flex-col gap-2 items-stretch">
            <button
              onClick={() => setJournalModalOpen(true)}
              className="px-4 py-2 border border-slate-700 rounded text-slate-400 text-[11px] uppercase tracking-[0.3em] hover:text-cyan-200 hover:border-cyan-500/40 transition-colors"
            >
              + Journal Entry
            </button>
            <button
              onClick={() => setRelapseModalOpen(true)}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400/70 text-xs uppercase tracking-wider hover:bg-red-500/20 transition-colors"
            >
              Relapse — Reset
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

      <NoteModal
        open={relapseModalOpen}
        title={`Relapse — ${dungeon?.name ?? dungeonId}`}
        placeholder="What triggered it? How are you feeling? (optional)"
        confirmLabel="Confirm Relapse"
        skipLabel="Cancel"
        tone="danger"
        cancelOnSkip
        showPublicToggle
        onSubmit={handleRelapse}
        onCancel={() => setRelapseModalOpen(false)}
      />
      <NoteModal
        open={journalModalOpen}
        title={`Journal — ${dungeon?.name ?? dungeonId}`}
        placeholder="What's on your mind today?"
        confirmLabel="Save Entry"
        skipLabel="Cancel"
        cancelOnSkip
        showPublicToggle
        onSubmit={handleJournal}
        onCancel={() => setJournalModalOpen(false)}
      />
    </div>
  );
}