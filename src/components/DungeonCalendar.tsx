"use client";
import { useMemo, useState } from "react";
import type { DayCheckIn } from "@/app/actions/dungeons";

interface DungeonCalendarProps {
  startDate: string | null;
  checkIns: DayCheckIn[];
  onDaySelect: (dateIso: string) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )
    .toISOString()
    .split("T")[0];
}

function ymdToIso(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m, d)).toISOString().split("T")[0];
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function diffDays(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime();
  const b = new Date(`${bIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function computeStreaks(
  cleared: Set<string>,
  today: string
): { current: number; longest: number } {
  // Longest: walk sorted cleared dates, track the longest run of
  // consecutive 1-day diffs.
  const sorted = [...cleared].sort();
  let longest = 0;
  let runLen = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    if (prev !== null && diffDays(prev, date) === 1) {
      runLen++;
    } else {
      runLen = 1;
    }
    if (runLen > longest) longest = runLen;
    prev = date;
  }

  // Current: count back from today (or yesterday if today not cleared).
  // A streak that ended more than 24h ago doesn't count as current.
  let current = 0;
  let cursor = today;
  if (!cleared.has(cursor)) cursor = shiftIso(today, -1);
  while (cleared.has(cursor)) {
    current++;
    cursor = shiftIso(cursor, -1);
  }

  return { current, longest };
}

export default function DungeonCalendar({
  startDate,
  checkIns,
  onDaySelect,
}: DungeonCalendarProps) {
  const today = todayIso();
  const initialMonth = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, []);
  const [view, setView] = useState(initialMonth);

  const checkInMap = useMemo(() => {
    const map: Record<string, DayCheckIn> = {};
    for (const c of checkIns) map[c.date] = c;
    return map;
  }, [checkIns]);

  const clearedSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkIns) if (c.state === "cleared") set.add(c.date);
    return set;
  }, [checkIns]);

  const streaks = useMemo(
    () => computeStreaks(clearedSet, today),
    [clearedSet, today]
  );

  const firstDay = new Date(Date.UTC(view.year, view.month, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(view.year, view.month + 1, 0)
  ).getUTCDate();

  const cells: Array<{ iso: string | null; day: number | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: ymdToIso(view.year, view.month, d), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });

  const monthLabel = `${MONTH_NAMES[view.month]} ${view.year}`;

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      const year = v.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  }

  return (
    <div className="bg-slate-950/40 border border-cyan-500/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shiftMonth(-1)}
          className="px-2 py-1 text-cyan-400/70 hover:text-cyan-300 text-sm"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-[11px] tracking-[0.3em] uppercase text-slate-400">
          {monthLabel}
        </p>
        <button
          onClick={() => shiftMonth(1)}
          className="px-2 py-1 text-cyan-400/70 hover:text-cyan-300 text-sm"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {(streaks.current > 0 || streaks.longest > 0) && (
        <div className="flex items-center justify-center gap-3 mb-3 text-[10px] tracking-widest uppercase">
          <span className="flex items-center gap-1.5 text-orange-300">
            <span className="text-sm leading-none">🔥</span>
            <span className="text-slate-500">Current</span>
            <span className="text-orange-300 font-bold tabular-nums">
              {streaks.current}d
            </span>
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="text-slate-500">Longest</span>
            <span className="text-amber-300 font-bold tabular-nums">
              {streaks.longest}d
            </span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center text-[9px] tracking-widest text-slate-600 uppercase py-1"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.iso || cell.day === null) {
            return <div key={i} className="aspect-square" />;
          }
          const iso = cell.iso;
          const isFuture = iso > today;
          const isToday = iso === today;
          const beforeStart = startDate ? iso < startDate : false;
          const entry = checkInMap[iso];
          const state = entry?.state;
          const tappable = !isFuture && !beforeStart;

          let bg = "bg-slate-900/40 border-slate-800/50 text-slate-700";
          let symbol: string | null = null;
          if (beforeStart) {
            bg = "bg-slate-950/40 border-transparent text-slate-800";
            symbol = "—";
          } else if (state === "cleared") {
            // Cells with at least one cleared neighbor (prev or next day)
            // get the brighter "in-chain" treatment so a long run reads
            // as a single visual current rather than a row of dots.
            const inChain =
              clearedSet.has(shiftIso(iso, -1)) ||
              clearedSet.has(shiftIso(iso, 1));
            bg = inChain
              ? "bg-emerald-500/30 border-emerald-400/70 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
              : "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.3)]";
            symbol = "✓";
          } else if (state === "relapsed") {
            bg = "bg-red-500/15 border-red-400/40 text-red-300";
            symbol = "×";
          } else if (isFuture) {
            bg = "bg-transparent border-transparent text-slate-800";
          } else if (isToday) {
            bg =
              "bg-cyan-500/10 border-cyan-400/60 text-cyan-200 animate-pulse";
            symbol = "?";
          } else {
            bg = "bg-amber-500/5 border-amber-500/30 text-amber-300/80";
            symbol = "?";
          }

          const ring = isToday ? " ring-1 ring-cyan-400/60" : "";
          const showCount =
            state === "relapsed" && entry && entry.count > 1;

          return (
            <button
              key={i}
              type="button"
              onClick={() => tappable && onDaySelect(iso)}
              disabled={!tappable}
              className={`relative aspect-square rounded border text-[10px] flex flex-col items-center justify-center transition-all ${bg}${ring} ${
                tappable
                  ? "hover:bg-cyan-500/20 hover:border-cyan-400 cursor-pointer"
                  : "cursor-default"
              }`}
              aria-label={`${iso}${state ? ` (${state}${showCount ? ` ×${entry.count}` : ""})` : ""}`}
            >
              <span className="leading-none">{cell.day}</span>
              {symbol && (
                <span className="text-[9px] leading-none mt-0.5">{symbol}</span>
              )}
              {showCount && (
                <span className="absolute top-0 right-0.5 text-[8px] text-red-200 font-bold leading-none">
                  {entry.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-3 text-[8px] tracking-widest uppercase text-slate-600">
        <span className="flex items-center gap-1">
          <span className="text-emerald-400">✓</span> Cleared
        </span>
        <span className="flex items-center gap-1">
          <span className="text-amber-300/80">?</span> Tap to log
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-300">×</span> Relapse
        </span>
      </div>
    </div>
  );
}