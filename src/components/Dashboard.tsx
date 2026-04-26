"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import { drainQueue } from "@/lib/offlineDrain";

const DASHBOARD_CACHE_KEY = "dashboard";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(() =>
    typeof window === "undefined"
      ? null
      : readCache<DashboardData>(DASHBOARD_CACHE_KEY)
  );

  const reload = () => {
    drainQueue()
      .catch(() => {})
      .then(() => getDashboardData(todayLocalISO()))
      .then((d) => {
        if (hasPendingMutations()) return;
        writeCache(DASHBOARD_CACHE_KEY, d);
        setDashboard(d);
      })
      .catch(() => {});
  };

  const handleRunEnded = (dungeonId: string) => {
    // Drop the card from the local list immediately so it doesn't linger
    // while the server reload is in flight.
    setDashboard((d) =>
      d
        ? {
            ...d,
            activeRuns: d.activeRuns.filter((r) => r.dungeonId !== dungeonId),
            details: { ...d.details, [dungeonId]: {} },
          }
        : d
    );
    reload();
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

  const initialHashScrollDone = useRef(false);
  useEffect(() => {
    if (!dashboard) return;
    if (initialHashScrollDone.current) return;
    const hash = window.location.hash;
    if (!hash) {
      initialHashScrollDone.current = true;
      return;
    }
    // Retry up to 5 times — the dungeon card might not be in the DOM
    // yet when this effect first fires (especially on first nav from
    // /portals → /#dungeon-X with a freshly entered run).
    let attempts = 0;
    let cancelled = false;
    const tryScroll = () => {
      if (cancelled) return;
      const target = document.getElementById(hash.slice(1));
      if (target) {
        initialHashScrollDone.current = true;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      attempts++;
      if (attempts >= 8) {
        initialHashScrollDone.current = true;
        return;
      }
      setTimeout(tryScroll, 80);
    };
    tryScroll();
    return () => {
      cancelled = true;
    };
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

        {dashboard && activeRuns.length === 0 && (
          <div className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.05)] p-6 text-center">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-3">
              [ Portal Registry Awaits ]
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mb-5 max-w-sm mx-auto">
              No active dungeons yet. Choose your first portal to begin
              shaping your hunter&apos;s path.
            </p>
            <Link
              href="/portals"
              className="inline-block px-6 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
            >
              Enter Portal Registry →
            </Link>
          </div>
        )}

        {dashboard &&
          activeRuns.map((run) => {
            const d = getDungeon(run.dungeonId);
            if (!d) return null;
            const detail = details[run.dungeonId] ?? {};
            const handleEnded = () => handleRunEnded(run.dungeonId);
            let card: React.ReactNode = null;
            if (d.ruleType === "continuous_streak") {
              card = (
                <StreakCard
                  dungeonId={run.dungeonId}
                  initialRun={run}
                  onStreakChange={reload}
                  onRelapse={handleEnded}
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
                  onRelapse={handleEnded}
                />
              );
            } else if (d.ruleType === "timed") {
              card = (
                <TimedDungeonCard
                  dungeonId={run.dungeonId}
                  initialRun={run}
                  onRelapse={handleEnded}
                  onComplete={handleEnded}
                />
              );
            } else if (d.ruleType === "cadence") {
              card = (
                <CadenceDungeonCard
                  dungeonId={run.dungeonId}
                  initialRun={run}
                  initialWeekWorkouts={detail.weekWorkouts ?? []}
                  onRelapse={handleEnded}
                />
              );
            } else if (d.ruleType === "progressive") {
              card = (
                <ProgressiveDungeonCard
                  dungeonId={run.dungeonId}
                  initialActive={run.active}
                  initialRungCounts={detail.rungCounts ?? {}}
                  onRelapse={handleEnded}
                  onComplete={handleEnded}
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