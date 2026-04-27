"use client";
import { useEffect, useRef, useState } from "react";
import {
  clearCheckIn,
  confirmDay,
  getCheckIns,
  type DayCheckIn,
} from "@/app/actions/dungeons";
import {
  notifyReward,
  notifyStatsUpdated,
  XP_PER_STREAK_DAY,
} from "@/lib/player";
import { drainQueue } from "@/lib/offlineDrain";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { track } from "@/lib/analytics";
import DungeonCalendar from "@/components/DungeonCalendar";
import NoteModal from "@/components/NoteModal";

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
  const [checkIns, setCheckIns] = useState<DayCheckIn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [relapseNoteOpen, setRelapseNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const onClearedCountChangeRef = useRef(onClearedCountChange);
  useEffect(() => {
    onClearedCountChangeRef.current = onClearedCountChange;
  });

  useEffect(() => {
    let cancelled = false;
    getCheckIns(dungeonId)
      .then((c) => {
        if (!cancelled) {
          setCheckIns(c);
          onClearedCountChangeRef.current(
            c.filter((x) => x.state === "cleared").length
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dungeonId]);

  const today = todayIso();
  const todayEntry = checkIns.find((c) => c.date === today);

  function reportClearedCount(list: DayCheckIn[]) {
    onClearedCountChangeRef.current(
      list.filter((c) => c.state === "cleared").length
    );
  }

  async function commitCleared(date: string) {
    let nextList: DayCheckIn[] = [];
    setCheckIns((prev) => {
      const filtered = prev.filter((c) => c.date !== date);
      const result = [...filtered, { date, state: "cleared" as const, count: 1 }]
        .sort((a, b) => a.date.localeCompare(b.date));
      nextList = result;
      return result;
    });
    reportClearedCount(nextList);
    notifyReward({ xp: XP_PER_STREAK_DAY });
    notifyStatsUpdated({ xpDelta: XP_PER_STREAK_DAY });
    track("day_confirmed_cleared", { dungeon_id: dungeonId, date });

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
    let nextList: DayCheckIn[] = [];
    setCheckIns((prev) => {
      const existing = prev.find((c) => c.date === date);
      const nextCount =
        existing && existing.state === "relapsed" ? existing.count + 1 : 1;
      const filtered = prev.filter((c) => c.date !== date);
      const result = [
        ...filtered,
        { date, state: "relapsed" as const, count: nextCount },
      ].sort((a, b) => a.date.localeCompare(b.date));
      nextList = result;
      return result;
    });
    reportClearedCount(nextList);
    track("day_confirmed_relapsed", { dungeon_id: dungeonId, date });
    notifyStatsUpdated();

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
    let nextList: DayCheckIn[] = [];
    setCheckIns((prev) => {
      const result = prev.filter((c) => c.date !== date);
      nextList = result;
      return result;
    });
    reportClearedCount(nextList);
    notifyStatsUpdated();
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

      {!loading && (
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