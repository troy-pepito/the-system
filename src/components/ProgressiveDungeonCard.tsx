"use client";
import { useState } from "react";
import { getDungeon } from "@/lib/dungeons";
import { notifyStatsUpdated } from "@/lib/player";
import {
  enterDungeon,
  endRun,
  logRungExposure,
  undoRungExposure,
} from "@/app/actions/dungeons";

interface ProgressiveDungeonCardProps {
  dungeonId: string;
  initialActive: boolean;
  initialRungCounts: Record<string, number>;
  onRelapse?: () => void;
  onComplete?: () => void;
}

export default function ProgressiveDungeonCard({
  dungeonId,
  initialActive,
  initialRungCounts,
  onRelapse,
  onComplete,
}: ProgressiveDungeonCardProps) {
  const dungeon = getDungeon(dungeonId);
  const RUNGS = dungeon?.progressive?.rungs ?? [];

  const [active, setActive] = useState<boolean>(initialActive);
  const [counts, setCounts] =
    useState<Record<string, number>>(initialRungCounts);
  const [busy, setBusy] = useState(false);

  const currentRungIndex = RUNGS.findIndex(
    (r) => (counts[r.id] ?? 0) < r.target
  );
  const dungeonCleared = currentRungIndex === -1 && RUNGS.length > 0;
  const currentRung = currentRungIndex >= 0 ? RUNGS[currentRungIndex] : null;

  async function handleEnsureActive() {
    if (!active) {
      await enterDungeon(dungeonId);
      setActive(true);
    }
  }

  async function handleLog() {
    if (!currentRung || busy) return;
    setBusy(true);
    try {
      await handleEnsureActive();
      const { count, dungeonCleared: cleared } = await logRungExposure(
        dungeonId,
        currentRung.id
      );
      setCounts((prev) => ({ ...prev, [currentRung.id]: count }));
      if (cleared) {
        setActive(false);
        if (onComplete) onComplete();
      }
      notifyStatsUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!currentRung || busy) return;
    setBusy(true);
    try {
      const { count } = await undoRungExposure(dungeonId, currentRung.id);
      setCounts((prev) => ({ ...prev, [currentRung.id]: count }));
      notifyStatsUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function handleRelapse() {
    await endRun(dungeonId, "relapse");
    setActive(false);
    setCounts({});
    if (onRelapse) onRelapse();
    notifyStatsUpdated();
  }

  const currentCount = currentRung ? counts[currentRung.id] ?? 0 : 0;
  const currentPercent = currentRung
    ? Math.min(100, Math.round((currentCount / currentRung.target) * 100))
    : 100;

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        {dungeon?.name ?? dungeonId}
      </p>

      {dungeonCleared ? (
        <div className="py-6 space-y-2">
          <p className="text-sm text-amber-300 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse">
            ★ Ladder Mastered ★
          </p>
          <p className="text-xs text-slate-500">
            All {RUNGS.length} rungs cleared. Dungeon retired.
          </p>
        </div>
      ) : currentRung ? (
        <div className="space-y-4">
          <div className="py-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
              Rank {currentRung.rank} · Rung {currentRungIndex + 1} / {RUNGS.length}
            </p>
            <p className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] mt-1 uppercase tracking-wider">
              {currentRung.name}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 px-2">
              {currentRung.description}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
              <span>Progress</span>
              <span className="text-cyan-300 font-bold">
                {currentCount} / {currentRung.target}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                style={{ width: `${currentPercent}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLog}
              disabled={busy}
              className="flex-1 px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-300 text-sm uppercase tracking-widest hover:bg-cyan-500/30 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] disabled:opacity-50"
            >
              + Log Exposure
            </button>
            {currentCount > 0 && (
              <button
                onClick={handleUndo}
                disabled={busy}
                className="px-3 py-3 bg-slate-800/60 border border-slate-700 rounded text-slate-400 text-xs uppercase tracking-wider hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              >
                Undo
              </button>
            )}
          </div>

          <div className="border border-slate-700 rounded-lg p-3 space-y-2 text-left">
            <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 mb-1">
              Ladder
            </p>
            <ul className="space-y-1.5">
              {RUNGS.map((r, i) => {
                const c = counts[r.id] ?? 0;
                const cleared = c >= r.target;
                const isCurrent = i === currentRungIndex;
                const locked = i > currentRungIndex;
                return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-3 text-xs ${
                      cleared
                        ? "text-amber-300"
                        : isCurrent
                        ? "text-cyan-300"
                        : "text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded border text-[10px] font-bold flex-shrink-0 ${
                        cleared
                          ? "bg-amber-500/20 border-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                          : isCurrent
                          ? "bg-cyan-500/10 border-cyan-400/60 animate-pulse"
                          : "bg-slate-800/50 border-slate-700"
                      }`}
                    >
                      {r.rank}
                    </span>
                    <span className="uppercase tracking-wider flex-1">
                      {locked ? "???" : r.name}
                    </span>
                    <span className="text-[10px] font-mono">
                      {locked ? "—" : `${c}/${r.target}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {active && (
            <button
              onClick={handleRelapse}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400/70 text-xs uppercase tracking-wider hover:bg-red-500/20 transition-colors"
            >
              Abandon Ladder — Reset
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-600 py-4">No rungs configured.</p>
      )}
    </div>
  );
}