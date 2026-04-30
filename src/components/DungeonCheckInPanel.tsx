"use client";
import { useEffect, useRef, useState } from "react";
import {
  clearCheckIn,
  confirmDay,
  getCheckIns,
  type DayCheckIn,
} from "@/app/actions/dungeons";
import { getDungeon, TIER_BONUS_XP } from "@/lib/dungeons";
import {
  notifyReward,
  notifyStatsUpdated,
  STATS_UPDATED_EVENT,
  XP_PER_STREAK_DAY,
} from "@/lib/player";
import { drainQueue } from "@/lib/offlineDrain";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { readCache, writeCache } from "@/lib/offlineCache";
import { track } from "@/lib/analytics";
import DungeonCalendar from "@/components/DungeonCalendar";
import NoteModal from "@/components/NoteModal";

const checkInCacheKey = (dungeonId: string) => `checkins:${dungeonId}`;

interface DungeonCheckInPanelProps {
  dungeonId: string;
  dungeonName: string;
  startDate: string | null;
  onClearedCountChange: (count: number) => void;
}

function todayIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )
    .toISOString()
    .split("T")[0];
}

export default function DungeonCheckInPanel({
  dungeonId,
  dungeonName,
  startDate,
  onClearedCountChange,
}: DungeonCheckInPanelProps) {
  // Initialize empty on both server and client so SSR HTML matches
  // first-client render. Cache hydration runs in the useEffect below
  // before the server fetch settles.
  const [checkIns, setCheckIns] = useState<DayCheckIn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [relapseNoteOpen, setRelapseNoteOpen] = useState(false);
  const [hasData, setHasData] = useState(false);

  const onClearedCountChangeRef = useRef(onClearedCountChange);
  useEffect(() => {
    onClearedCountChangeRef.current = onClearedCountChange;
  });

  useEffect(() => {
    let cancelled = false;
    const cached = readCache<DayCheckIn[]>(checkInCacheKey(dungeonId));
    if (cached) {
      setCheckIns(cached);
      setHasData(true);
      onClearedCountChangeRef.current(
        cached.filter((c) => c.state === "cleared").length
      );
    }
    const fetchFromServer = () => {
      getCheckIns(dungeonId)
        .then((c) => {
          if (cancelled) return;
          setCheckIns(c);
          setHasData(true);
          writeCache(checkInCacheKey(dungeonId), c);
          onClearedCountChangeRef.current(
            c.filter((x) => x.state === "cleared").length
          );
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
  }, [dungeonId]);

  const today = todayIso();
  const todayEntry = checkIns.find((c) => c.date === today);

  function reportClearedCount(list: DayCheckIn[]) {
    onClearedCountChangeRef.current(
      list.filter((c) => c.state === "cleared").length
    );
    writeCache(checkInCacheKey(dungeonId), list);
  }

  async function commitCleared(date: string) {
    // Compute next list from the closure synchronously — using the
    // functional updater + outer variable mutation was unreliable in
    // React 18 (the updater can run after the next line, leaving
    // nextList as the initial empty array → cleared count rendered as 0).
    const wasAlreadyCleared =
      checkIns.find((c) => c.date === date)?.state === "cleared";
    const filtered = checkIns.filter((c) => c.date !== date);
    const nextList: DayCheckIn[] = [
      ...filtered,
      { date, state: "cleared" as const, count: 1 },
    ].sort((a, b) => a.date.localeCompare(b.date));
    setCheckIns(nextList);
    reportClearedCount(nextList);
    const dims = getDungeon(dungeonId)?.dimensions ?? {};
    notifyReward({
      xp: XP_PER_STREAK_DAY,
      body: dims.body,
      mind: dims.mind,
      emotion: dims.emotion,
      energy: dims.energy,
      spirit: dims.spirit,
      source: `${dungeonName} · Day Cleared`,
    });
    notifyStatsUpdated({ xpDelta: XP_PER_STREAK_DAY });
    track("day_confirmed_cleared", { dungeon_id: dungeonId, date });

    // Tier crossing celebration: if this commit moves the cleared count
    // onto a tier's day threshold for the first time, fire a second
    // toast a beat after the per-day one so the milestone lands as its
    // own moment.
    if (!wasAlreadyCleared) {
      const newClearedCount = nextList.filter(
        (c) => c.state === "cleared"
      ).length;
      const def = getDungeon(dungeonId);
      if (def?.tiers) {
        const tierCap =
          def.ruleType === "timed" && def.timed
            ? def.timed.targetDays
            : Infinity;
        const tierIdx = def.tiers.findIndex(
          (t) => t.days === newClearedCount && t.days <= tierCap
        );
        if (tierIdx >= 0) {
          const tier = def.tiers[tierIdx];
          const bonus = TIER_BONUS_XP[tierIdx] ?? 0;
          const celebKey = `tier-celebrated:${dungeonId}:${startDate ?? "x"}:${tier.rank}`;
          if (
            typeof window !== "undefined" &&
            !localStorage.getItem(celebKey)
          ) {
            try {
              localStorage.setItem(celebKey, "1");
            } catch {}
            setTimeout(() => {
              notifyReward({
                xp: bonus,
                source: `🏆 Rank ${tier.rank} · ${dungeonName}`,
              });
              notifyStatsUpdated({ xpDelta: bonus });
            }, 1100);
          }
        }
      }
    }

    try {
      await confirmDay(dungeonId, date, "cleared");
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:confirmDay",
        dungeonId,
        dateIso: date,
        state: "cleared",
      });
      drainQueue().catch(() => {});
    }
  }

  async function commitRelapsed(
    date: string,
    note?: string,
    isPublic = false
  ) {
    // Compute XP delta BEFORE we mutate state — if the day was cleared,
    // marking it relapsed wipes that day's XP.
    const existing = checkIns.find((c) => c.date === date);
    const prevState = existing?.state;
    const xpDelta = prevState === "cleared" ? -XP_PER_STREAK_DAY : 0;

    const nextCount =
      existing && existing.state === "relapsed" ? existing.count + 1 : 1;
    const filtered = checkIns.filter((c) => c.date !== date);
    const nextList: DayCheckIn[] = [
      ...filtered,
      { date, state: "relapsed" as const, count: nextCount },
    ].sort((a, b) => a.date.localeCompare(b.date));
    setCheckIns(nextList);
    reportClearedCount(nextList);
    track("day_confirmed_relapsed", { dungeon_id: dungeonId, date });
    // Pass an explicit xpDelta (even 0) so the panel's own
    // STATS_UPDATED_EVENT listener skips its refetch — otherwise it
    // races with the server write below and clobbers our optimistic
    // update with a stale read.
    notifyStatsUpdated({ xpDelta });

    try {
      await confirmDay(
        dungeonId,
        date,
        "relapsed",
        note,
        isPublic
      );
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:confirmDay",
        dungeonId,
        dateIso: date,
        state: "relapsed",
        ...(note ? { note, isPublic } : {}),
      });
      drainQueue().catch(() => {});
    }
  }

  async function commitUndo(date: string) {
    // Same race-fix as commitRelapsed: figure out the XP impact before
    // we drop the entry, then notify with an explicit delta so the
    // refetch listener stays out of our way.
    const removed = checkIns.find((c) => c.date === date);
    const xpDelta = removed?.state === "cleared" ? -XP_PER_STREAK_DAY : 0;

    const nextList: DayCheckIn[] = checkIns.filter((c) => c.date !== date);
    setCheckIns(nextList);
    reportClearedCount(nextList);
    notifyStatsUpdated({ xpDelta });
    try {
      await clearCheckIn(dungeonId, date);
    } catch {
      // Best-effort — no offline queue for undo.
    }
  }

  function openRelapseModal() {
    setRelapseNoteOpen(true);
  }

  function handleRelapseSubmit(note: string | null, isPublic?: boolean) {
    setRelapseNoteOpen(false);
    if (!pending) return;
    const date = pending;
    setPending(null);
    void commitRelapsed(date, note ?? undefined, isPublic ?? false);
  }

  const promptDate = pending ?? (todayEntry ? null : today);
  const showPrompt = !!promptDate && !!startDate;
  const promptExisting = promptDate
    ? checkIns.find((c) => c.date === promptDate)
    : undefined;

  return (
    <div className="space-y-3">
      {showPrompt && promptDate && (
        <div className="bg-cyan-500/10 border border-cyan-400/40 rounded-lg p-3 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300 text-center">
            {promptExisting?.state === "cleared"
              ? `${promptDate} — currently cleared`
              : promptExisting?.state === "relapsed"
              ? `${promptDate} — ${promptExisting.count} relapse${
                  promptExisting.count === 1 ? "" : "s"
                }`
              : promptDate === today
              ? "Did you clear today?"
              : `Confirm ${promptDate}`}
          </p>
          <div className="flex gap-2 flex-wrap">
            {promptExisting?.state !== "cleared" && (
              <button
                onClick={() => {
                  const date = promptDate;
                  setPending(null);
                  void commitCleared(date);
                }}
                className="flex-1 min-w-[6rem] px-3 py-2 bg-emerald-500/20 border border-emerald-400/50 rounded text-emerald-300 text-xs uppercase tracking-widest hover:bg-emerald-500/30 transition-colors shadow-[0_0_8px_rgba(52,211,153,0.3)]"
              >
                {promptExisting?.state === "relapsed"
                  ? "Mark Cleared"
                  : "Cleared"}
              </button>
            )}
            <button
              onClick={() => {
                setPending(promptDate);
                openRelapseModal();
              }}
              className="flex-1 min-w-[6rem] px-3 py-2 bg-red-500/15 border border-red-500/40 rounded text-red-300 text-xs uppercase tracking-widest hover:bg-red-500/25 transition-colors"
            >
              {promptExisting?.state === "relapsed"
                ? "Relapse +1"
                : promptExisting?.state === "cleared"
                ? "Mark Relapsed"
                : "Relapsed"}
            </button>
            {promptExisting && (
              <button
                onClick={() => {
                  const date = promptDate;
                  setPending(null);
                  void commitUndo(date);
                }}
                className="flex-1 min-w-[6rem] px-3 py-2 bg-slate-700/40 border border-slate-600 rounded text-slate-300 text-xs uppercase tracking-widest hover:bg-slate-700/60 transition-colors"
              >
                Undo
              </button>
            )}
          </div>
          {promptExisting && (
            <button
              onClick={() => setPending(null)}
              className="w-full text-[10px] tracking-widest uppercase text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {hasData && (
        <DungeonCalendar
          startDate={startDate}
          checkIns={checkIns}
          onDaySelect={(iso) => setPending(iso)}
        />
      )}

      <NoteModal
        open={relapseNoteOpen}
        title={`Relapse — ${dungeonName}`}
        placeholder="What triggered it? How are you feeling? (optional)"
        confirmLabel="Log Relapse"
        skipLabel="Cancel"
        tone="danger"
        cancelOnSkip
        showPublicToggle
        onSubmit={handleRelapseSubmit}
        onCancel={() => {
          setRelapseNoteOpen(false);
          setPending(null);
        }}
      />
    </div>
  );
}