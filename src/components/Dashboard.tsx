"use client";
import { useState, useEffect } from "react";
import StreakCard from "@/components/StreakCard";
import AllowanceDungeonCard from "@/components/AllowanceDungeonCard";
import StatCard from "@/components/StatCard";
import Card from "@/components/Card";
import DailyQuests, { QuestRewards } from "@/components/DailyQuests";
import {
  XP_PER_STREAK_DAY,
  XP_PER_WORKOUT,
  XP_PER_EXPOSURE,
  XP_PER_COMPLETION,
  getLevelFromXp,
  getRank,
  computeStreakDays,
  STATS_UPDATED_EVENT,
  hasPendingMutations,
} from "@/lib/player";
import { getDungeon } from "@/lib/dungeons";
import {
  getDashboardData,
  type DashboardData,
} from "@/app/actions/dungeons";
import { todayLocalISO } from "@/lib/quests";
import TimedDungeonCard from "@/components/TimedDungeonCard";
import CadenceDungeonCard from "@/components/CadenceDungeonCard";
import ProgressiveDungeonCard from "@/components/ProgressiveDungeonCard";

const ZERO_REWARDS: QuestRewards = { xp: 0, body: 0, mind: 0, emotion: 0, energy: 0, spirit: 0 };

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [questRewards, setQuestRewards] =
    useState<QuestRewards>(ZERO_REWARDS);

  const reload = () => {
    getDashboardData(todayLocalISO()).then((d) => {
      if (hasPendingMutations()) return;
      setDashboard(d);
      setQuestRewards(d.lifetimeRewards);
    });
  };

  useEffect(() => {
    reload();
    const onEvent = (e: Event) => {
      const delta = (e as CustomEvent<{ xpDelta?: number }>).detail?.xpDelta;
      if (typeof delta === "number") return;
      reload();
    };
    window.addEventListener(STATS_UPDATED_EVENT, onEvent);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, onEvent);
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [dashboard]);

  const activeRuns = dashboard?.activeRuns ?? [];
  const bonus = dashboard?.bonusXp ?? {
    workouts: 0,
    exposures: 0,
    completions: 0,
    bankedStreakDays: 0,
  };
  const details = dashboard?.details ?? {};

  const totalStreakDays = activeRuns.reduce(
    (sum, run) => sum + computeStreakDays(run.startDate),
    0
  );

  const bonusXp =
    bonus.workouts * XP_PER_WORKOUT +
    bonus.exposures * XP_PER_EXPOSURE +
    bonus.completions * XP_PER_COMPLETION +
    bonus.bankedStreakDays * XP_PER_STREAK_DAY;
  const milestoneXp = dashboard?.milestoneXp ?? 0;
  const totalXp =
    totalStreakDays * XP_PER_STREAK_DAY +
    questRewards.xp +
    bonusXp +
    milestoneXp;
  const { level } = getLevelFromXp(totalXp);
  const rank = getRank(level);

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Player Status Window
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <Card className="p-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Awakening Status
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Rank</p>
              <p className="text-2xl font-bold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">{rank}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Level</p>
              <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">{level}</p>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Dimensions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard name="BODY" value={questRewards.body} />
            <StatCard name="MIND" value={questRewards.mind} />
            <StatCard name="EMOTION" value={questRewards.emotion} />
            <StatCard name="ENERGY" value={questRewards.energy} />
            <div className="col-span-2">
              <StatCard name="SPIRIT" value={questRewards.spirit} />
            </div>
          </div>
        </div>

        {dashboard && (
          <DailyQuests
            initialTodayIds={dashboard.todayQuestIds}
            initialLifetime={dashboard.lifetimeRewards}
            priorComboDays={dashboard.priorComboDays}
            onRewardsChange={setQuestRewards}
          />
        )}

        {dashboard &&
          activeRuns.map((run) => {
            const d = getDungeon(run.dungeonId);
            if (!d) return null;
            const detail = details[run.dungeonId] ?? {};
            let card: React.ReactNode = null;
            if (d.ruleType === "continuous_streak") {
              card = (
                <StreakCard
                  dungeonId={run.dungeonId}
                  initialRun={run}
                  onStreakChange={reload}
                  onRelapse={reload}
                />
              );
            } else if (d.ruleType === "allowance") {
              card = (
                <AllowanceDungeonCard
                  dungeonId={run.dungeonId}
                  eventType={d.allowance?.unitLabel ?? "consume"}
                  initialRun={run}
                  initialMonthCount={detail.monthCount ?? 0}
                  onStreakChange={reload}
                  onRelapse={reload}
                />
              );
            } else if (d.ruleType === "timed") {
              card = (
                <TimedDungeonCard
                  dungeonId={run.dungeonId}
                  initialRun={run}
                  onRelapse={reload}
                  onComplete={reload}
                />
              );
            } else if (d.ruleType === "cadence") {
              card = (
                <CadenceDungeonCard
                  dungeonId={run.dungeonId}
                  initialRun={run}
                  initialWeekWorkouts={detail.weekWorkouts ?? []}
                  onRelapse={reload}
                />
              );
            } else if (d.ruleType === "progressive") {
              card = (
                <ProgressiveDungeonCard
                  dungeonId={run.dungeonId}
                  initialActive={run.active}
                  initialRungCounts={detail.rungCounts ?? {}}
                  onRelapse={reload}
                  onComplete={reload}
                />
              );
            }
            if (!card) return null;
            return (
              <div
                key={run.dungeonId}
                id={`dungeon-${run.dungeonId}`}
                className="scroll-mt-20"
              >
                {card}
              </div>
            );
          })}
      </div>
    </main>
  );
}