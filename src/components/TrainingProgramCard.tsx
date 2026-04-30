"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDungeon,
  trainingProgramTarget,
  type TrainingProgramTier,
} from "@/lib/dungeons";
import {
  notifyReward,
  notifyStatsUpdated,
  notifySystemMessage,
  XP_PER_STREAK_DAY,
} from "@/lib/player";
import DateEntryPicker from "@/components/DateEntryPicker";
import {
  getCheckIns,
  logTrainingAttempt,
  type DayCheckIn,
  type DungeonRunState,
} from "@/app/actions/dungeons";
import {
  endRunInCache,
  setRunStartDateInCache,
} from "@/lib/dashboardCacheOps";
import {
  commitSetStartDate,
  useEndRunAction,
  useJournalAction,
} from "@/lib/dungeonActions";
import NoteModal from "@/components/NoteModal";
import { readCache, writeCache } from "@/lib/offlineCache";
import { STATS_UPDATED_EVENT } from "@/lib/player";

const checkInCacheKey = (dungeonId: string) => `checkins:${dungeonId}`;

interface TrainingProgramCardProps {
  dungeonId: string;
  initialRun: DungeonRunState;
  onStreakChange?: (days: number) => void;
  onExit?: () => void;
}

function todayIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )
    .toISOString()
    .split("T")[0];
}

export default function TrainingProgramCard({
  dungeonId,
  initialRun,
  onStreakChange,
  onExit,
}: TrainingProgramCardProps) {
  const dungeon = getDungeon(dungeonId);
  const dungeonName = dungeon?.name ?? dungeonId;
  const tp = dungeon?.trainingProgram;
  const TIERS: TrainingProgramTier[] = tp?.tiers ?? [];

  const [startDate, setStartDate] = useState<string | null>(
    initialRun.startDate
  );
  const [checkIns, setCheckIns] = useState<DayCheckIn[]>([]);
  const [hasData, setHasData] = useState(false);
  const [reps, setReps] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const onStreakChangeRef = useRef(onStreakChange);
  useEffect(() => {
    onStreakChangeRef.current = onStreakChange;
  });

  const journal = useJournalAction({ dungeonId, dungeonName });
  const exitAction = useEndRunAction({
    dungeonId,
    dungeonName,
    reason: "exited",
    onLocalReset: () => {
      setStartDate(null);
      setCheckIns([]);
      endRunInCache(dungeonId);
      onStreakChangeRef.current?.(0);
      onExit?.();
    },
  });

  // Hydrate the day-checkins for this program. Same shape as the
  // streak/timed dungeons — reuses getCheckIns + the local cache so
  // the calendar/streak count is instant on revisit.
  useEffect(() => {
    if (!startDate) return;
    let cancelled = false;
    const cached = readCache<DayCheckIn[]>(checkInCacheKey(dungeonId));
    if (cached) {
      setCheckIns(cached);
      setHasData(true);
    }
    const fetchFromServer = () => {
      getCheckIns(dungeonId)
        .then((c) => {
          if (cancelled) return;
          setCheckIns(c);
          setHasData(true);
          writeCache(checkInCacheKey(dungeonId), c);
        })
        .catch(() => {});
    };
    fetchFromServer();
    const onStats = (e: Event) => {
      const delta = (e as CustomEvent<{ xpDelta?: number }>).detail?.xpDelta;
      if (typeof delta === "number") return;
      fetchFromServer();
    };
    window.addEventListener(STATS_UPDATED_EVENT, onStats);
    return () => {
      cancelled = true;
      window.removeEventListener(STATS_UPDATED_EVENT, onStats);
    };
  }, [dungeonId, startDate]);

  const clearedCount = checkIns.filter((c) => c.state === "cleared").length;

  // Push the cleared count up to the dashboard whenever it changes —
  // that's what feeds the public profile + tier display elsewhere.
  useEffect(() => {
    onStreakChangeRef.current?.(clearedCount);
  }, [clearedCount]);

  async function handleDatePick(date: string) {
    setStartDate(date);
    setRunStartDateInCache(dungeonId, date);
    onStreakChangeRef.current?.(0);
    notifyStatsUpdated();
    await commitSetStartDate(dungeonId, date);
  }

  const today = todayIso();
  const todayEntry = checkIns.find((c) => c.date === today);
  const { earnedTierIdx, target } = tp
    ? trainingProgramTarget(tp.tiers, clearedCount)
    : { earnedTierIdx: -1, target: 0 };
  const earnedTier = earnedTierIdx >= 0 ? TIERS[earnedTierIdx] : null;
  const nextTier = TIERS[earnedTierIdx + 1] ?? null;
  const atSRank = earnedTierIdx >= TIERS.length - 1 && earnedTierIdx >= 0;

  const handleLog = useCallback(
    async (date: string, value: number) => {
      if (!tp || submitting) return;
      setSubmitting(true);
      try {
        const wasAlreadyCleared =
          checkIns.find((c) => c.date === date)?.state === "cleared";
        const optimisticState: "cleared" | "relapsed" =
          value >= target ? "cleared" : "relapsed";
        const filtered = checkIns.filter((c) => c.date !== date);
        const nextList: DayCheckIn[] = [
          ...filtered,
          { date, state: optimisticState, count: value },
        ].sort((a, b) => a.date.localeCompare(b.date));
        setCheckIns(nextList);
        writeCache(checkInCacheKey(dungeonId), nextList);
        setReps("");

        if (optimisticState === "cleared" && !wasAlreadyCleared) {
          notifyReward({
            xp: XP_PER_STREAK_DAY,
            source: `${dungeonName} · ${value} ${
              value === 1 ? tp.unit : tp.unitPlural
            }`,
          });
          notifyStatsUpdated({ xpDelta: XP_PER_STREAK_DAY });
        } else if (optimisticState === "relapsed") {
          // No XP bump — but still fire a soft system notice so the
          // log felt acknowledged. Honesty over inflation.
          notifySystemMessage({
            headline: "Logged Short",
            body: `${value}/${target}. The path waits — try again tomorrow.`,
          });
          notifyStatsUpdated({ xpDelta: 0 });
        } else {
          // Re-logged a same-day cleared (count adjustment) — quiet.
          notifyStatsUpdated({ xpDelta: 0 });
        }

        await logTrainingAttempt(dungeonId, date, value);
      } catch {
        // Reload from server on failure to recover canonical state.
        getCheckIns(dungeonId).then(setCheckIns).catch(() => {});
      } finally {
        setSubmitting(false);
      }
    },
    [checkIns, dungeonId, dungeonName, submitting, target, tp]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(reps, 10);
    if (!Number.isFinite(n) || n < 0) return;
    void handleLog(today, n);
  }

  if (!tp) {
    return (
      <div className="bg-slate-900/80 border border-red-500/40 rounded-xl p-5 text-center text-xs text-red-300">
        Training program config missing for {dungeonId}.
      </div>
    );
  }

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
              {clearedCount === 1 ? "day" : "days"} cleared
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {TIERS.map((t, i) => {
              const cleared = i <= earnedTierIdx;
              const isNext = nextTier && t.rank === nextTier.rank && !atSRank;
              return (
                <div
                  key={t.rank}
                  className={`w-12 h-12 flex flex-col items-center justify-center rounded border text-[10px] font-bold transition-all ${
                    cleared
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : isNext
                      ? "bg-cyan-500/10 border-cyan-400/60 text-cyan-300 animate-pulse"
                      : "bg-slate-800/50 border-slate-700 text-slate-600"
                  }`}
                >
                  <span className="text-sm leading-none">{t.rank}</span>
                  <span className="text-[8px] opacity-70 mt-0.5">
                    {t.reps}/d
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border border-cyan-500/30 bg-cyan-500/5 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 mb-1">
                Today&apos;s Target
              </p>
              <p className="text-3xl font-bold text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                {target}{" "}
                <span className="text-sm text-cyan-400/70 font-normal uppercase tracking-wider">
                  {target === 1 ? tp.unit : tp.unitPlural}
                </span>
              </p>
              {earnedTier && (
                <p className="text-[10px] text-amber-300/70 tracking-widest uppercase mt-1">
                  Rank {earnedTier.rank} earned · climbing toward{" "}
                  {nextTier ? `Rank ${nextTier.rank}` : "S maintenance"}
                </p>
              )}
              {!earnedTier && (
                <p className="text-[10px] text-cyan-300/60 tracking-widest uppercase mt-1">
                  Earn Rank {TIERS[0]?.rank} by clearing {TIERS[0]?.days} days
                </p>
              )}
            </div>

            {todayEntry && (
              <div
                className={`text-xs uppercase tracking-wider px-3 py-2 rounded border ${
                  todayEntry.state === "cleared"
                    ? "text-emerald-300 border-emerald-400/40 bg-emerald-500/10"
                    : "text-red-300 border-red-500/40 bg-red-500/10"
                }`}
              >
                {todayEntry.state === "cleared"
                  ? `✓ Logged ${todayEntry.count}/${target} — Cleared`
                  : `Logged ${todayEntry.count}/${target} — short by ${target - todayEntry.count}`}
              </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder={String(target)}
                disabled={submitting}
                className="flex-1 min-w-0 bg-slate-950/60 border border-slate-700 rounded text-center text-cyan-100 text-lg font-mono tracking-wider py-2 focus:border-cyan-400/60 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={submitting || reps === ""}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-300 text-xs uppercase tracking-widest hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
              >
                {todayEntry ? "Re-log" : tp.actionVerb}
              </button>
            </form>
          </div>

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

          {!hasData && (
            <p className="text-[10px] text-slate-600 italic">
              Loading history…
            </p>
          )}
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

      <NoteModal {...exitAction.modalProps} />
      <NoteModal {...journal.modalProps} />
    </div>
  );
}
