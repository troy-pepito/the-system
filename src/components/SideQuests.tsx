"use client";
import { useState } from "react";
import {
  applyQuest,
  todayLocalISO,
  type SideQuest,
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

interface SideQuestsProps {
  quests: SideQuest[];
  initialCompletedIds: string[];
  onCompletedChange?: (ids: string[]) => void;
  onRewardsChange?: (rewards: QuestRewards) => void;
  initialLifetime: QuestRewards;
}

export default function SideQuests({
  quests,
  initialCompletedIds,
  onCompletedChange,
  onRewardsChange,
  initialLifetime,
}: SideQuestsProps) {
  const [completed, setCompleted] = useState<string[]>(initialCompletedIds);
  const [lifetime, setLifetime] = useState<QuestRewards>(initialLifetime);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  if (quests.length === 0) return null;

  async function toggleQuest(quest: SideQuest) {
    if (busyIds.has(quest.id)) return;
    const wasDone = completed.includes(quest.id);
    const isNowDone = !wasDone;
    const date = todayLocalISO();

    const nextCompleted = isNowDone
      ? [...completed, quest.id]
      : completed.filter((q) => q !== quest.id);
    const nextLifetime = applyQuest(lifetime, quest, isNowDone ? 1 : -1);

    setCompleted(nextCompleted);
    setLifetime(nextLifetime);
    onCompletedChange?.(nextCompleted);
    onRewardsChange?.(nextLifetime);
    setBusyIds((prev) => new Set(prev).add(quest.id));

    const cacheKey = dashboardCacheKey(date);
    const cached = readCache<DashboardData>(cacheKey);
    if (cached) {
      const others = cached.todayQuestIds.filter((id) => id !== quest.id);
      writeCache(cacheKey, {
        ...cached,
        todayQuestIds: isNowDone ? [...others, quest.id] : others,
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
        source: quest.name,
      });
    }

    beginMutation();
    try {
      await toggleQuestCompletion(quest.id, date);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "quest:toggle",
        questId: quest.id,
        date,
        desiredCompleted: isNowDone,
      });
      drainQueue().catch(() => {});
    } finally {
      endMutation();
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(quest.id);
        return next;
      });
    }
  }

  return (
    <div className="bg-slate-900/80 border border-amber-400/30 rounded-xl p-6 shadow-[0_0_20px_rgba(251,191,36,0.18)]">
      <div className="text-center mb-5">
        <p className="text-[10px] tracking-[0.4em] uppercase text-amber-400/80 mb-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          [ Side Quest ]
        </p>
        <h2 className="font-display text-base font-bold uppercase tracking-wider text-amber-100">
          A Special Quest Has Arrived
        </h2>
      </div>

      <ul className="space-y-3">
        {quests.map((quest) => {
          const done = completed.includes(quest.id);
          const saving = busyIds.has(quest.id);
          const expanded = expandedId === quest.id;
          return (
            <li
              key={quest.id}
              className="border border-amber-400/30 bg-slate-950/50 rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-3">
                <button
                  onClick={() => toggleQuest(quest)}
                  className="flex items-center gap-3 text-left flex-1 group"
                >
                  <span
                    className={`w-5 h-5 border flex items-center justify-center rounded transition-colors ${
                      done
                        ? "bg-amber-400/40 border-amber-300"
                        : "border-amber-400/50 group-hover:border-amber-300"
                    } ${saving ? "animate-pulse" : ""}`}
                  >
                    {done && <span className="text-amber-100 text-xs">✓</span>}
                  </span>
                  <span
                    className={`text-sm uppercase tracking-wider ${
                      done ? "text-slate-500 line-through" : "text-amber-100"
                    }`}
                  >
                    {quest.name}
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-mono tracking-wider shrink-0 ${
                      done
                        ? "text-slate-600"
                        : "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                    }`}
                  >
                    +{quest.xp} XP
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : quest.id)
                    }
                    aria-expanded={expanded}
                    className="text-[10px] tracking-widest uppercase text-amber-400/70 hover:text-amber-200 transition-colors"
                  >
                    {expanded ? "Hide" : "Rules"}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="border-t border-amber-400/20 px-4 py-3 bg-slate-950/70">
                  <p className="text-xs text-amber-200/80 italic mb-3 leading-relaxed">
                    {quest.tagline}
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {quest.rules.map((rule, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-400/70 mt-0.5">▸</span>
                        <span className="leading-relaxed">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}