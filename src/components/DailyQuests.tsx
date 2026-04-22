"use client";
import { useState } from "react";
import {
  QUESTS,
  applyQuest,
  todayLocalISO,
  COMBO_THRESHOLD,
  type QuestRewards,
} from "@/lib/quests";
import {
  notifyStatsUpdated,
  beginMutation,
  endMutation,
} from "@/lib/player";
import { toggleQuestCompletion } from "@/app/actions/quests";

export type { QuestRewards };

interface DailyQuestsProps {
  initialTodayIds: string[];
  initialLifetime: QuestRewards;
  priorComboDays: number;
  onRewardsChange?: (rewards: QuestRewards) => void;
}

export default function DailyQuests({
  initialTodayIds,
  initialLifetime,
  priorComboDays,
  onRewardsChange,
}: DailyQuestsProps) {
  const [completed, setCompleted] = useState<string[]>(initialTodayIds);
  const [lifetime, setLifetime] = useState<QuestRewards>(initialLifetime);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const todayQualifies = completed.length >= COMBO_THRESHOLD;
  const comboDays =
    priorComboDays > 0
      ? todayQualifies
        ? priorComboDays + 1
        : priorComboDays
      : todayQualifies
        ? 1
        : 0;
  const remainingForCombo = Math.max(0, COMBO_THRESHOLD - completed.length);

  async function toggleQuest(id: string) {
    if (busyIds.has(id)) return;
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest) return;

    const wasDone = completed.includes(id);
    const isNowDone = !wasDone;
    const prevCompleted = completed;
    const prevLifetime = lifetime;

    const nextCompleted = isNowDone
      ? [...completed, id]
      : completed.filter((q) => q !== id);
    const nextLifetime = applyQuest(lifetime, quest, isNowDone ? 1 : -1);

    setCompleted(nextCompleted);
    setLifetime(nextLifetime);
    onRewardsChange?.(nextLifetime);
    setBusyIds((prev) => new Set(prev).add(id));

    const xpDelta = (isNowDone ? 1 : -1) * quest.xp;
    notifyStatsUpdated({ xpDelta });

    beginMutation();
    try {
      await toggleQuestCompletion(id, todayLocalISO());
    } catch {
      setCompleted(prevCompleted);
      setLifetime(prevLifetime);
      onRewardsChange?.(prevLifetime);
      notifyStatsUpdated({ xpDelta: -xpDelta });
    } finally {
      endMutation();
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
  <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-6 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
    <p className="text-xs tracking-[0.3em] uppercase text-cyan-400/70 text-center mb-1">
      (!) Quest Info
    </p>
    <h2 className="text-sm uppercase tracking-wider text-slate-200 text-center mb-4">
      Daily Quest — Forge the Awakened Self
    </h2>
    <p className="text-emerald-400 text-center uppercase tracking-widest text-sm mb-4">
      Goals
    </p>

    <ul className="space-y-2 mb-6">
      {QUESTS.map((quest) => {
        const done = completed.includes(quest.id);
        return (
          <li key={quest.id} className="flex items-center justify-between">
            <button
              onClick={() => toggleQuest(quest.id)}
              className="flex items-center gap-3 text-left w-full group"
            >
              <span className={`w-5 h-5 border flex items-center justify-center rounded ${done ? "bg-cyan-500/30 border-cyan-400" : "border-cyan-500/40 group-hover:border-cyan-400"}`}>
                {done && <span className="text-cyan-300 text-xs">✓</span>}
              </span>
              <span className={`text-sm uppercase tracking-wider ${done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                - {quest.name}
              </span>
            </button>
            <span className="text-xs text-cyan-400/60">[{done ? 1 : 0}/1]</span>
          </li>
        );
      })}
    </ul>

    <div className="border-t border-cyan-500/10 pt-4 flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-cyan-400/70 tracking-[0.3em] uppercase">
          Daily Combo
        </span>
        <span
          className={`text-2xl font-bold tabular-nums ${
            comboDays > 0
              ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              : "text-slate-600"
          }`}
        >
          {comboDays}
        </span>
        <span className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">
          {comboDays === 1 ? "Day" : "Days"}
        </span>
      </div>
      {comboDays === 0 ? (
        <p className="text-[10px] text-slate-500 tracking-wider text-center">
          Complete {COMBO_THRESHOLD}+ quests to start a combo.
        </p>
      ) : todayQualifies ? (
        <p className="text-[10px] text-emerald-400/80 tracking-[0.2em] uppercase">
          Combo extended · See you tomorrow
        </p>
      ) : (
        <p className="text-[10px] text-amber-400/80 tracking-[0.2em] uppercase">
          {remainingForCombo} more to keep the combo alive
        </p>
      )}
    </div>
  </div>
);
}