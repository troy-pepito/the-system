"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  QUESTS,
  applyQuest,
  todayLocalISO,
  COMBO_THRESHOLD,
  COMBO_MILESTONES,
  PERFECT_DAY_BONUS_XP,
  type QuestRewards,
} from "@/lib/quests";
import {
  notifyStatsUpdated,
  notifyReward,
  notifyCelebration,
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
import DailyResetCountdown from "@/components/DailyResetCountdown";

export type { QuestRewards };

interface DailyQuestsProps {
  initialTodayIds: string[];
  initialLifetime: QuestRewards;
  priorComboDays: number;
  /** Per-quest XP bonus from the player's highest combo milestone. */
  questBonus?: number;
  /**
   * True when the player has prior activity but missed yesterday, drives
   * the red-tinted header treatment so they notice the gap and pick the
   * cadence back up today. Computed server-side in getComboState.
   */
  scattered?: boolean;
  onRewardsChange?: (rewards: QuestRewards) => void;
}

/** Quest IDs use kebab-case in the data layer ("cold-shower"), but
 *  message keys can't carry hyphens cleanly inside dot-paths, so we
 *  store them snake-cased ("quest_cold_shower"). */
function questKey(questId: string): string {
  return `quest_${questId.replace(/-/g, "_")}`;
}

export default function DailyQuests({
  initialTodayIds,
  initialLifetime,
  priorComboDays,
  questBonus = 0,
  scattered = false,
  onRewardsChange,
}: DailyQuestsProps) {
  const t = useTranslations("dailyQuests");
  const [completed, setCompleted] = useState<string[]>(initialTodayIds);
  const [lifetime, setLifetime] = useState<QuestRewards>(initialLifetime);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // Belt-and-suspenders sync: when Dashboard re-fetches and passes new
  // initialTodayIds (e.g. after a server reload picks up a toggle that
  // happened in another tab, or recovers from a stale-cache window),
  // mirror it into local `completed`. Skipped while a toggle is in
  // flight, the optimistic local state is the truth during that window
  // and a stale parent prop would briefly flicker the tick off.
  useEffect(() => {
    if (busyIds.size > 0) return;
    setCompleted(initialTodayIds);
  }, [initialTodayIds, busyIds.size]);

  // Same for lifetime rewards. Server reload brings authoritative XP
  // totals; local state catches up so the gain log + display agree.
  useEffect(() => {
    if (busyIds.size > 0) return;
    setLifetime(initialLifetime);
  }, [initialLifetime, busyIds.size]);

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

    const scaledQuestXp = quest.xp + questBonus;
    const xpDelta = (isNowDone ? 1 : -1) * scaledQuestXp;
    notifyStatsUpdated({ xpDelta });

    if (isNowDone) {
      track("quest_completed", {
        quest_id: quest.id,
        quest_xp: scaledQuestXp,
      });
      // Once-per-account funnel event: when this is the hunter's
      // first-ever quest tick, fire a separate event so the
      // post-awakening → first-action drop-off can be measured. Gated
      // by localStorage so a re-tick after refresh doesn't double-fire.
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem("system:first_quest_completed")
      ) {
        try {
          localStorage.setItem("system:first_quest_completed", "1");
        } catch {}
        track("first_quest_completed", {
          quest_id: quest.id,
        });
      }
      notifyReward({
        xp: scaledQuestXp,
        body: quest.body,
        mind: quest.mind,
        emotion: quest.emotion,
        energy: quest.energy,
        spirit: quest.spirit,
        sourceKey: `dailyQuests.${questKey(quest.id)}`,
      });
    }

    // Perfect-day bonus: credit when the toggle flips us from "not all
    // ticked" to "all ticked"; refund (and reset the celeb key so a
    // re-credit can happen) when the toggle flips us back. Without the
    // refund branch, unchecking after a full clear would let the player
    // pocket the bonus indefinitely.
    const oldFull = completed.length === QUESTS.length;
    const newFull = nextCompleted.length === QUESTS.length;
    const perfectKey = `perfect-day-bonus:${date}`;
    if (!oldFull && newFull) {
      if (typeof window !== "undefined" && !localStorage.getItem(perfectKey)) {
        try {
          localStorage.setItem(perfectKey, "1");
        } catch {}
        track("perfect_day_bonus", { date, xp: PERFECT_DAY_BONUS_XP });
        setTimeout(() => {
          notifyReward({
            xp: PERFECT_DAY_BONUS_XP,
            sourceKey: "gainSources.perfectDay",
          });
          notifyStatsUpdated({ xpDelta: PERFECT_DAY_BONUS_XP });
          notifyCelebration({
            titleKey: "celebration.perfectDayTitle",
            subtitleKey: "celebration.perfectDaySubtitle",
            xp: PERFECT_DAY_BONUS_XP,
            tone: "amber",
          });
        }, 700);
      }
    } else if (oldFull && !newFull) {
      if (typeof window !== "undefined" && localStorage.getItem(perfectKey)) {
        try {
          localStorage.removeItem(perfectKey);
        } catch {}
        notifyStatsUpdated({ xpDelta: -PERFECT_DAY_BONUS_XP });
      }
    }

    // Combo-milestone celebration: same pattern as perfect-day. Credit
    // when the toggle pushes us over COMBO_THRESHOLD into a milestone
    // day count, refund when it drops us back below.
    const oldQualifies = completed.length >= COMBO_THRESHOLD;
    const newQualifies = nextCompleted.length >= COMBO_THRESHOLD;
    const newComboDays = priorComboDays > 0 ? priorComboDays + 1 : 1;
    const milestone = COMBO_MILESTONES.find((m) => m.days === newComboDays);
    if (milestone) {
      const comboKey = `combo-celebrated:${date}:${milestone.days}`;
      if (!oldQualifies && newQualifies) {
        if (typeof window !== "undefined" && !localStorage.getItem(comboKey)) {
          try {
            localStorage.setItem(comboKey, "1");
          } catch {}
          setTimeout(() => {
            notifyReward({
              xp: milestone.xp,
              sourceKey: "dailyQuests.comboSource",
              sourceValues: { days: milestone.days },
            });
            notifyStatsUpdated({ xpDelta: milestone.xp });
            notifyCelebration({
              titleKey: "celebration.comboTitle",
              titleValues: { days: milestone.days },
              subtitleKey: "celebration.comboSubtitle",
              xp: milestone.xp,
              tone: "amber",
            });
          }, 900);
        }
      } else if (oldQualifies && !newQualifies) {
        if (typeof window !== "undefined" && localStorage.getItem(comboKey)) {
          try {
            localStorage.removeItem(comboKey);
          } catch {}
          notifyStatsUpdated({ xpDelta: -milestone.xp });
        }
      }
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
      <p
        className={`text-[10px] tracking-[0.4em] uppercase mb-2 ${
          scattered
            ? "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.6)]"
            : "text-cyan-400/70"
        }`}
      >
        {t("header")}
      </p>
      <h2
        className={`font-display text-base font-bold uppercase tracking-wider ${
          scattered ? "text-red-200" : "text-cyan-100"
        }`}
      >
        {t("subheader")}
      </h2>
      <p className="text-[10px] font-mono tabular-nums tracking-wider text-cyan-400/70 mt-2">
        {t("progressLabel", { done: completed.length, total: QUESTS.length })}
      </p>
      <DailyResetCountdown label={t("resetsIn")} urgent={scattered} />
      {scattered && (
        <p className="text-[10px] tracking-[0.2em] uppercase text-red-400/80 mt-2 max-w-[260px] mx-auto">
          {t("systemWarningScattered")}
        </p>
      )}
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
                - {t(questKey(quest.id))}
              </span>
            </button>
            <span
              className={`text-[10px] font-mono tracking-wider shrink-0 ${
                done ? "text-slate-600" : "text-cyan-400/80"
              }`}
              title={
                questBonus > 0
                  ? t("bonusTooltip", { base: quest.xp, bonus: questBonus })
                  : undefined
              }
            >
              +{quest.xp + questBonus} XP
            </span>
          </li>
        );
      })}
    </ul>

    <div className="border-t border-cyan-500/10 pt-4 flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-cyan-400/70 tracking-[0.3em] uppercase">
          {t("dailyCombo")}
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
          {t("dayLabel", { count: comboDays })}
        </span>
      </div>
      {comboDays === 0 ? (
        <p className="text-[10px] text-slate-500 tracking-wider text-center">
          {t("startCombo", { threshold: COMBO_THRESHOLD })}
        </p>
      ) : todayQualifies ? (
        <p className="text-[10px] text-emerald-400/80 tracking-[0.2em] uppercase">
          {t("comboExtended")}
        </p>
      ) : (
        <p className="text-[10px] text-amber-400/80 tracking-[0.2em] uppercase">
          {t("keepAlive", { count: remainingForCombo })}
        </p>
      )}
    </div>
  </div>
);
}