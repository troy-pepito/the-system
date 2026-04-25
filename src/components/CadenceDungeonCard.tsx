"use client";
import { useState } from "react";
import { getDungeon } from "@/lib/dungeons";
import {
  computeStreakDays,
  notifyStatsUpdated,
  notifyReward,
  beginMutation,
  endMutation,
  XP_PER_WORKOUT,
} from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import {
  setRunStartDate,
  endRun,
  logJournalEntry,
  toggleWorkout,
  type DungeonRunState,
} from "@/app/actions/dungeons";
import { track } from "@/lib/analytics";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import {
  endRunInCache,
  setRunStartDateInCache,
  setWorkoutInCache,
} from "@/lib/dashboardCacheOps";
import NoteModal from "@/components/NoteModal";

interface CadenceDungeonCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  initialWeekWorkouts: string[];
  onStreakChange?: (days: number) => void;
  onRelapse?: () => void;
}

export default function CadenceDungeonCard({
  dungeonId,
  initialRun,
  initialWeekWorkouts,
  onStreakChange,
  onRelapse,
}: CadenceDungeonCardProps) {
  const dungeon = getDungeon(dungeonId);
  const TIERS = dungeon?.tiers ?? [];
  const cadence = dungeon?.cadence;
  const WORKOUTS = cadence?.workouts ?? [];
  const TARGET = cadence?.weeklyTarget ?? WORKOUTS.length;

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [streak, setStreak] = useState(computeStreakDays(initialRun.startDate));
  const [completed, setCompleted] = useState<string[]>(initialWeekWorkouts);
  const [relapseModalOpen, setRelapseModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  async function handleJournal(note: string | null) {
    setJournalModalOpen(false);
    if (!note) return;
    try {
      await logJournalEntry(dungeonId, note);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:journalLog",
        dungeonId,
        note,
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

  async function handleToggle(workoutId: string) {
    const wasDone = completed.includes(workoutId);
    const isNowDone = !wasDone;

    setCompleted(
      isNowDone ? [...completed, workoutId] : completed.filter((id) => id !== workoutId)
    );
    setWorkoutInCache(dungeonId, workoutId, isNowDone);
    const xpDelta = (isNowDone ? 1 : -1) * XP_PER_WORKOUT;
    notifyStatsUpdated({ xpDelta });
    if (isNowDone) notifyReward({ xp: XP_PER_WORKOUT });

    beginMutation();
    try {
      await toggleWorkout(dungeonId, workoutId);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:workoutToggle",
        dungeonId,
        workoutId,
        desiredCompleted: isNowDone,
      });
      drainQueue().catch(() => {});
    } finally {
      endMutation();
    }
  }

  async function handleRelapse(note: string | null) {
    setRelapseModalOpen(false);
    track("relapse", {
      dungeon_id: dungeonId,
      rule_type: "cadence",
      streak_days: streak,
    });
    setStartDate(null);
    setStreak(0);
    setCompleted([]);
    endRunInCache(dungeonId);
    if (onStreakChange) onStreakChange(0);
    if (onRelapse) onRelapse();
    notifyStatsUpdated();

    try {
      await endRun(dungeonId, "relapse", note ?? undefined);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:endRun",
        dungeonId,
        reason: "relapse",
        ...(note ? { note } : {}),
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

  const weekCount = completed.length;
  const weekPercent = Math.min(100, Math.round((weekCount / TARGET) * 100));
  const weekCleared = weekCount >= TARGET;

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
              {streak === 1 ? "day" : "days"} forged
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

          <div className="border border-slate-700 rounded-lg p-4 space-y-3 text-left">
            <div className="flex justify-between items-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70">
                This Week
              </p>
              <span
                className={`text-xs font-bold ${
                  weekCleared ? "text-emerald-400" : "text-cyan-300"
                }`}
              >
                {weekCount} / {TARGET}
              </span>
            </div>

            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  weekCleared
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                    : "bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                }`}
                style={{ width: `${weekPercent}%` }}
              />
            </div>

            <ul className="space-y-2 pt-1">
              {WORKOUTS.map((w) => {
                const done = completed.includes(w.id);
                return (
                  <li key={w.id}>
                    <button
                      onClick={() => handleToggle(w.id)}
                      className="flex items-center gap-3 text-left w-full group"
                    >
                      <span
                        className={`w-5 h-5 border flex items-center justify-center rounded transition-all ${
                          done
                            ? "bg-emerald-500/30 border-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                            : "border-cyan-500/40 group-hover:border-cyan-400"
                        }`}
                      >
                        {done && <span className="text-emerald-300 text-xs">✓</span>}
                      </span>
                      <span
                        className={`text-sm uppercase tracking-wider flex-1 ${
                          done ? "text-slate-500 line-through" : "text-slate-200"
                        }`}
                      >
                        {w.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {weekCleared && (
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest text-center pt-1 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]">
                ✦ Week cleared ✦
              </p>
            )}
          </div>

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
        placeholder="What threw the rhythm off? (optional)"
        confirmLabel="Confirm Relapse"
        skipLabel="Cancel"
        tone="danger"
        cancelOnSkip
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
        onSubmit={handleJournal}
        onCancel={() => setJournalModalOpen(false)}
      />
    </div>
  );
}