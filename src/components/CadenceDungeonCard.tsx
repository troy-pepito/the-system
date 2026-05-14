"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CADENCE_FULL_CLEAR_BONUS_XP,
  getDungeon,
  getDungeonAccent,
} from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
import { todayLocalISO } from "@/lib/quests";
import { track } from "@/lib/analytics";
import {
  computeStreakDays,
  notifyStatsUpdated,
  notifyReward,
  notifyCelebration,
  beginMutation,
  endMutation,
  XP_PER_WORKOUT,
} from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import {
  toggleWorkout,
  type DungeonRunState,
} from "@/app/actions/dungeons";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import {
  endRunInCache,
  setRunStartDateInCache,
  setWorkoutInCache,
} from "@/lib/dashboardCacheOps";
import {
  commitSetStartDate,
  useEndRunAction,
  useJournalAction,
} from "@/lib/dungeonActions";
import { useTierCrossingCelebration } from "@/lib/tierCelebration";
import { getRankStyle } from "@/lib/rankStyle";
import NoteModal from "@/components/NoteModal";

/** De-dup key for the full-clear bonus. Daily windows fire once per
 *  date; weekly windows fire once per ISO Monday. */
function cadenceWindowKey(window: "day" | "week"): string {
  const today = todayLocalISO();
  if (window === "day") return today;
  const d = new Date(`${today}T00:00:00Z`);
  const dow = d.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().split("T")[0];
}

interface CadenceDungeonCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  initialWeekWorkouts: string[];
  onStreakChange?: (days: number) => void;
  onExit?: () => void;
}

export default function CadenceDungeonCard({
  dungeonId,
  initialRun,
  initialWeekWorkouts,
  onStreakChange,
  onExit,
}: CadenceDungeonCardProps) {
  const tDungeons = useTranslations("dungeons");
  const tRun = useTranslations("dungeonRun");
  const dungeon = getDungeon(dungeonId);
  const dungeonName = dungeon
    ? tDungeons(`${dungeonKey(dungeonId)}.name`)
    : dungeonId;
  const TIERS = dungeon?.tiers ?? [];
  const accent = getDungeonAccent(dungeonId);
  const cadence = dungeon?.cadence;
  const WORKOUTS = cadence?.workouts ?? [];
  const TARGET = cadence?.target ?? WORKOUTS.length;

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [streak, setStreak] = useState(computeStreakDays(initialRun.startDate));
  const [completed, setCompleted] = useState<string[]>(initialWeekWorkouts);

  const tierIdxForHook = TIERS.filter((t) => streak >= t.days).length - 1;
  const tierRankForHook =
    tierIdxForHook >= 0 ? TIERS[tierIdxForHook].rank : null;
  useTierCrossingCelebration({
    dungeonId,
    dungeonName,
    startDate,
    tierIdx: tierIdxForHook,
    tierRank: tierRankForHook,
  });

  const journal = useJournalAction({ dungeonId, dungeonName });
  const exitAction = useEndRunAction({
    dungeonId,
    dungeonName,
    reason: "exited",
    onLocalReset: () => {
      setStartDate(null);
      setStreak(0);
      setCompleted([]);
      endRunInCache(dungeonId);
      onStreakChange?.(0);
      onExit?.();
    },
  });

  async function handleDatePick(date: string) {
    setStartDate(date);
    const days = computeStreakDays(date);
    setStreak(days);
    setRunStartDateInCache(dungeonId, date);
    onStreakChange?.(days);
    notifyStatsUpdated();
    // Seed the tier-celebration sentinel for this run so the first
    // tier reached (typically E at 7 days) fires a normal celebration.
    // The hook's first-detection branch otherwise silently records the
    // current tier and swallows the toast, that catch-up is meant for
    // existing high-tier players on a feature-first-load, not for runs
    // that start at tierIdx=-1.
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`tier-last-seen:${dungeonId}:${date}`, "-1");
      } catch {}
    }
    await commitSetStartDate(dungeonId, date);
  }

  async function handleToggle(workoutId: string) {
    const wasDone = completed.includes(workoutId);
    const isNowDone = !wasDone;

    const nextCompleted = isNowDone
      ? [...completed, workoutId]
      : completed.filter((id) => id !== workoutId);
    setCompleted(nextCompleted);
    setWorkoutInCache(dungeonId, workoutId, isNowDone);
    const xpDelta = (isNowDone ? 1 : -1) * XP_PER_WORKOUT;
    notifyStatsUpdated({ xpDelta });
    if (isNowDone) {
      const dims = dungeon?.dimensions ?? {};
      notifyReward({
        xp: XP_PER_WORKOUT,
        body: dims.body,
        mind: dims.mind,
        emotion: dims.emotion,
        energy: dims.energy,
        spirit: dims.spirit,
        sourceKey: "gainSources.taskCleared",
        sourceValues: { dungeonId },
      });
    }

    // Full-clear bonus: credit when the toggle flips us from "not all
    // ticked" to "all ticked"; refund (and reset the celeb key) when
    // the toggle flips us back. Without the refund branch, unchecking
    // a workout after a full clear would let the player keep the bonus
    // indefinitely.
    const isAllClear =
      WORKOUTS.length > 0 && nextCompleted.length === WORKOUTS.length;
    const wasAllClear =
      WORKOUTS.length > 0 && completed.length === WORKOUTS.length;
    if (WORKOUTS.length > 0 && wasAllClear !== isAllClear) {
      const windowStart = cadenceWindowKey(cadence?.window ?? "day");
      const celebKey = `cadence-full-clear:${dungeonId}:${windowStart}`;
      if (!wasAllClear && isAllClear) {
        if (
          typeof window !== "undefined" &&
          !localStorage.getItem(celebKey)
        ) {
          try {
            localStorage.setItem(celebKey, "1");
          } catch {}
          track("cadence_full_clear_bonus", {
            dungeon_id: dungeonId,
            xp: CADENCE_FULL_CLEAR_BONUS_XP,
          });
          setTimeout(() => {
            notifyReward({
              xp: CADENCE_FULL_CLEAR_BONUS_XP,
              sourceKey: "gainSources.fullClear",
              sourceValues: { dungeonId },
            });
            notifyStatsUpdated({ xpDelta: CADENCE_FULL_CLEAR_BONUS_XP });
            notifyCelebration({
              titleKey: "celebration.fullClearTitle",
              subtitleKey: "celebration.fullClearSubtitle",
              subtitleValues: { dungeon: dungeonName },
              xp: CADENCE_FULL_CLEAR_BONUS_XP,
              tone: "emerald",
            });
          }, 700);
        }
      } else {
        // wasAllClear && !isAllClear → refund.
        if (typeof window !== "undefined" && localStorage.getItem(celebKey)) {
          try {
            localStorage.removeItem(celebKey);
          } catch {}
          notifyStatsUpdated({ xpDelta: -CADENCE_FULL_CLEAR_BONUS_XP });
        }
      }
    }

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

  const highestClearedIndex = TIERS.filter((t) => streak >= t.days).length - 1;
  const nextTier = TIERS[highestClearedIndex + 1] ?? null;
  const prevDays = highestClearedIndex >= 0 ? TIERS[highestClearedIndex].days : 0;
  const progressToNext = nextTier
    ? Math.min(100, Math.round(((streak - prevDays) / (nextTier.days - prevDays)) * 100))
    : 100;
  // For ramping tasks: index into repsByTier of the target the player
  // is currently working toward. Pre-E uses 0; post-S clamps to last.
  const rampIdx = Math.min(
    Math.max(highestClearedIndex + 1, 0),
    Math.max(TIERS.length - 1, 0)
  );
  const taskLabel = (w: typeof WORKOUTS[number]): string => {
    if (!w.repsByTier || !w.unit) return w.name;
    const reps = w.repsByTier[Math.min(rampIdx, w.repsByTier.length - 1)];
    return `${reps} ${reps === 1 ? w.unit : w.unitPlural ?? w.unit}`;
  };

  const weekCount = completed.length;
  const weekPercent = Math.min(100, Math.round((weekCount / TARGET) * 100));
  const weekCleared = weekCount >= TARGET;

  return (
    <div className={`bg-slate-900/80 border rounded-xl p-5 text-center ${accent.border} ${accent.glow}`}>
      <p className="text-xs uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
        {dungeon?.icon && (
          <span className={`text-base leading-none ${accent.iconText}`} aria-hidden>
            {dungeon.icon}
          </span>
        )}
        <span className={accent.nameText}>{dungeonName}</span>
      </p>
      {startDate ? (
        <div className="space-y-4">
          <div className="py-2">
            <p className="text-4xl font-bold text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
              {streak}
            </p>
            <p className="text-xs text-emerald-400/60 uppercase tracking-wider mt-1">
              {tRun("daysForged", { count: streak })}
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
                <span>{tRun("daysFraction", { count: streak, target: nextTier.days })}</span>
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

          <div className="border border-slate-700 rounded-lg p-4 space-y-3 text-left">
            <div className="flex justify-between items-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-300">
                {cadence?.window === "day" ? tRun("today") : tRun("thisWeek")}
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
                        {taskLabel(w)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {weekCleared && (
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest text-center pt-1 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]">
                {cadence?.window === "day" ? tRun("dayCleared") : tRun("weekCleared")}
              </p>
            )}
          </div>

          <p className="text-[10px] text-slate-600">{tRun("entered", { date: startDate })}</p>
          <div className="flex flex-col gap-2 items-stretch">
            <button
              onClick={journal.open}
              className="px-4 py-2 border border-slate-700 rounded text-slate-300 text-[11px] uppercase tracking-[0.3em] hover:text-cyan-200 hover:border-cyan-500/40 transition-colors"
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

      <NoteModal {...exitAction.modalProps} />
      <NoteModal {...journal.modalProps} />
    </div>
  );
}