"use client";
import { useRef, useState } from "react";
import {
  QUESTS,
  applyQuest,
  todayLocalISO,
  type QuestRewards,
} from "@/lib/quests";
import { notifyStatsUpdated } from "@/lib/player";
import { toggleQuestCompletion } from "@/app/actions/quests";

export type { QuestRewards };

interface DailyQuestsProps {
  initialTodayIds: string[];
  initialLifetime: QuestRewards;
  onRewardsChange?: (rewards: QuestRewards) => void;
}

export default function DailyQuests({
  initialTodayIds,
  initialLifetime,
  onRewardsChange,
}: DailyQuestsProps) {
  const [completed, setCompleted] = useState<string[]>(initialTodayIds);
  const [lifetime, setLifetime] = useState<QuestRewards>(initialLifetime);
  const pendingCount = useRef(0);

  async function toggleQuest(id: string) {
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

    const xpDelta = (isNowDone ? 1 : -1) * quest.xp;
    notifyStatsUpdated({ xpDelta });

    pendingCount.current++;
    try {
      await toggleQuestCompletion(id, todayLocalISO());
      pendingCount.current--;
      if (pendingCount.current === 0) notifyStatsUpdated();
    } catch {
      pendingCount.current--;
      setCompleted(prevCompleted);
      setLifetime(prevLifetime);
      onRewardsChange?.(prevLifetime);
      notifyStatsUpdated({ xpDelta: -xpDelta });
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

    <p className="text-xs text-center text-slate-400 leading-relaxed">
      <span className="text-red-400 font-bold">CAUTION!</span> — If the daily quest remains incomplete, penalties will be given accordingly.
    </p>
  </div>
);
}