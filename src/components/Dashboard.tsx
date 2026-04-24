"use client";
import { useState, useEffect } from "react";
import StreakCard from "@/components/StreakCard";
import AllowanceDungeonCard from "@/components/AllowanceDungeonCard";
import DailyQuests from "@/components/DailyQuests";
import {
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
import { readCache, writeCache } from "@/lib/offlineCache";

const DASHBOARD_CACHE_KEY = "dashboard";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(() =>
    typeof window === "undefined"
      ? null
      : readCache<DashboardData>(DASHBOARD_CACHE_KEY)
  );

  const reload = () => {
    getDashboardData(todayLocalISO())
      .then((d) => {
        if (hasPendingMutations()) return;
        writeCache(DASHBOARD_CACHE_KEY, d);
        setDashboard(d);
      })
      .catch(() => {});
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
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingMutations()) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
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
  const details = dashboard?.details ?? {};

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Player Status Window
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        {dashboard && (
          <DailyQuests
            initialTodayIds={dashboard.todayQuestIds}
            initialLifetime={dashboard.lifetimeRewards}
            priorComboDays={dashboard.priorComboDays}
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
                className="scroll-mt-32 sm:scroll-mt-24"
              >
                {card}
              </div>
            );
          })}
      </div>
    </main>
  );
}