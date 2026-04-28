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
  notifyReward,
  beginMutation,
  endMutation,
} from "@/lib/player";
import { toggleQuestCompletion } from "@/app/actions/quests";
import { track } from "@/lib/analytics";
import { readCache, writeCache } from "@/lib/offlineCache";
import { dashboardCacheKey } from "@/lib/dashboardCacheOps";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import type { DashboardData } from "@/app/actions/dungeons";

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
    const date = todayLocalISO();

    const nextCompleted = isNowDone
      ? [...completed, id]
      : completed.filter((q) => q !== id);
    const nextLifetime = applyQuest(lifetime, quest, isNowDone ? 1 : -1);

    setCompleted(nextCompleted);
    setLifetime(nextLifetime);
    onRewardsChange?.(nextLifetime);
    setBusyIds((prev) => new Set(prev).add(id));

    const key = dashboardCacheKey(date);
    const cached = readCache<DashboardData>(key);
    if (cached) {
      writeCache(key, {
        ...cached,
        todayQuestIds: nextCompleted,
        lifetimeRewards: nextLifetime,
      });
    }

    const xpDelta = (isNowDone ? 1 : -1) * quest.xp;
    notifyStatsUpdated({ xpDelta });

    if (isNowDone) {
      track("quest_completed", {
        quest_id: quest.id,
        quest_xp: quest.xp,
      });
      notifyReward({
        xp: quest.xp,
        body: quest.body,
        mind: quest.mind,
        emotion: quest.emotion,
        energy: quest.energy,
        spirit: quest.spirit,
      });
    }

    beginMutation();
    try {
      await toggleQuestCompletion(id, date);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "quest:toggle",
        questId: id,
        date,
        desiredCompleted: isNowDone,
      });
      drainQueue().catch(() => {});
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
    <div className="text-center mb-6">
      <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-2">
        (!) Daily Quests
      </p>
      <h2 className="font-display text-base font-bold uppercase tracking-wider text-cyan-100">
        Forge the Awakened Self
      </h2>
    </div>

    <ul className="space-y-3 mb-6">
      {QUESTS.map((quest) => {
        const done = completed.includes(quest.id);
        const saving = busyIds.has(quest.id);
        return (
          <li key={quest.id} className="flex items-center justify-between">
            <button
              onClick={() => toggleQuest(quest.id)}
              className="flex items-center gap-3 text-left w-full group"
            >
              <span className={`w-5 h-5 border flex items-center justify-center rounded transition-colors ${done ? "bg-cyan-500/30 border-cyan-400" : "border-cyan-500/40 group-hover:border-cyan-400"} ${saving ? "animate-pulse" : ""}`}>
                {done && <span className="text-cyan-300 text-xs">✓</span>}
              </span>
              <span className={`text-sm uppercase tracking-wider ${done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                - {quest.name}
              </span>
            </button>
            <span className={`text-[10px] font-mono tracking-wider shrink-0 ${done ? "text-slate-600" : "text-cyan-400/80"}`}>
              +{quest.xp} XP
            </span>
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