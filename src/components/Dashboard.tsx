"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import StreakCard from "@/components/StreakCard";
import DailyQuests from "@/components/DailyQuests";
import SideQuests from "@/components/SideQuests";
import SortableDungeonItem from "@/components/SortableDungeonItem";
import {
  STATS_UPDATED_EVENT,
  hasPendingMutations,
} from "@/lib/player";
import { getDungeon } from "@/lib/dungeons";
import {
  getDashboardData,
  type DashboardData,
} from "@/app/actions/dungeons";
import { todayLocalISO, availableSideQuests, SIDE_QUESTS } from "@/lib/quests";
import TimedDungeonCard from "@/components/TimedDungeonCard";
import CadenceDungeonCard from "@/components/CadenceDungeonCard";
import ProgressiveDungeonCard from "@/components/ProgressiveDungeonCard";
import { readCache, writeCache } from "@/lib/offlineCache";
import { dashboardCacheKey } from "@/lib/dashboardCacheOps";
import { drainQueue } from "@/lib/offlineDrain";

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const tDashboardExtra = useTranslations("dashboard2");
  const { user } = useUser();
  // Initialize null both server- and client-side to keep SSR and first
  // client render identical. Cache hydration happens in the useEffect
  // below before the server fetch completes.
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  // Saved dungeon ordering, keyed by Clerk unsafeMetadata.dungeonOrder.
  // Cross-device because it lives on the user record, not localStorage.
  // Local override exists so drag-and-drop reorders feel instant,
  // we mirror the server write into local state on drag end and let
  // Clerk's metadata catch up in the background.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 5px distance constraint instead of a hold delay: drag is
      // handle-only now (the grip in the top-right of each card has
      // touch-action:none + setActivatorNodeRef), so we don't need to
      // distinguish a tap-on-card from a drag-on-card. Short distance
      // gate is enough to swallow accidental click-without-move on
      // the handle.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reload = () => {
    drainQueue()
      .catch(() => {})
      .then(() => {
        const today = todayLocalISO();
        return getDashboardData(today).then((d) => ({ d, today }));
      })
      .then(({ d, today }) => {
        if (hasPendingMutations()) return;
        writeCache(dashboardCacheKey(today), d);
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
    // Hydrate from cache first so the dashboard pops in instantly,
    // then fetch fresh from server.
    const cached = readCache<DashboardData>(
      dashboardCacheKey(todayLocalISO())
    );
    if (cached) setDashboard(cached);
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

  // Force a fresh fetch when the tab regains focus or the network
  // comes back, so stale localStorage snapshots (e.g. an ended run
  // still appearing on the Status page) self-correct without the
  // user having to clear data.
  useEffect(() => {
    const onWake = () => reload();
    const onVisibility = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
    let attempts = 0;
    let cancelled = false;
    let recenterTimer: ReturnType<typeof setTimeout> | null = null;
    let lastAutoY = -1;

    const scrollToTarget = () => {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return target;
    };

    const tryScroll = () => {
      if (cancelled) return;
      const target = scrollToTarget();
      if (target) {
        // Snapshot the auto-scroll Y after smooth scroll settles, then
        // re-center once more after 1.8s. The cache→server fetch can
        // shift content above the card and push it out of view; the
        // recenter pulls it back, but only if the user hasn't scrolled
        // away in the interim.
        setTimeout(() => {
          if (!cancelled) lastAutoY = window.scrollY;
        }, 600);
        recenterTimer = setTimeout(() => {
          if (cancelled) return;
          const userMoved =
            lastAutoY >= 0 && Math.abs(window.scrollY - lastAutoY) > 80;
          if (!userMoved) scrollToTarget();
          initialHashScrollDone.current = true;
        }, 1800);
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
      if (recenterTimer) clearTimeout(recenterTimer);
    };
  }, [dashboard]);

  const rawActiveRuns = dashboard?.activeRuns ?? [];
  const details = dashboard?.details ?? {};
  // Apply saved order: local override (just-dragged) > Clerk metadata >
  // server default order. Runs not present in the saved order list
  // (newly entered dungeons) drift to the bottom but keep relative
  // dashboard order so the new card lands somewhere predictable.
  const savedOrder =
    orderOverride ??
    ((user?.unsafeMetadata?.dungeonOrder as string[] | undefined) ?? []);
  const orderIndex = new Map(savedOrder.map((id, i) => [id, i]));
  const activeRuns = useMemo(
    () =>
      [...rawActiveRuns].sort((a, b) => {
        const ai = orderIndex.has(a.dungeonId)
          ? orderIndex.get(a.dungeonId)!
          : Number.POSITIVE_INFINITY;
        const bi = orderIndex.has(b.dungeonId)
          ? orderIndex.get(b.dungeonId)!
          : Number.POSITIVE_INFINITY;
        return ai - bi;
      }),
    [rawActiveRuns, orderIndex]
  );
  const dungeonIds = activeRuns.map((r) => r.dungeonId);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dungeonIds.indexOf(String(active.id));
    const newIndex = dungeonIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(dungeonIds, oldIndex, newIndex);
    // Optimistic local override so the card snaps into place instantly.
    setOrderOverride(nextOrder);
    // Cross-device sync via Clerk metadata. Best-effort: if the write
    // fails (offline / Clerk hiccup), the local override still drives
    // the UI for this session and the next refresh falls back to the
    // last successfully-synced order.
    user
      ?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          dungeonOrder: nextOrder,
        },
      })
      .catch(() => {});
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {t("header")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        {dashboard && (
          <DailyQuests
            key={todayLocalISO()}
            initialTodayIds={dashboard.todayQuestIds}
            initialLifetime={dashboard.lifetimeRewards}
            priorComboDays={dashboard.priorComboDays}
            questBonus={dashboard.questBonus}
            scattered={dashboard.scattered}
          />
        )}

        {dashboard &&
          (() => {
            const today = todayLocalISO();
            const offered = availableSideQuests(today);
            if (offered.length === 0) return null;
            const sideQuestIds = new Set(SIDE_QUESTS.map((q) => q.id));
            const completedSide = dashboard.todayQuestIds.filter((id) =>
              sideQuestIds.has(id)
            );
            return (
              <SideQuests
                key={`side-${today}`}
                quests={offered}
                initialCompletedIds={completedSide}
                initialLifetime={dashboard.lifetimeRewards}
              />
            );
          })()}

        {dashboard && activeRuns.length === 0 && (() => {
          // Fresh hunter detection: zero active runs AND zero lifetime
          // quest XP. They've awakened but haven't done anything yet,
          // the generic "Portal Registry Awaits" empty state didn't
          // tell them where to start. Returning hunters who've exited
          // all their dungeons keep the original copy.
          const isFreshHunter = dashboard.lifetimeRewards.xp === 0;
          return (
            <div className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.05)] p-6 text-center">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />
              <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-3">
                {isFreshHunter
                  ? t("firstHunterHeader")
                  : t("noActiveDungeons")}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-5 max-w-sm mx-auto">
                {isFreshHunter
                  ? t("firstHunterBody")
                  : t("noActiveDungeonsBody")}
              </p>
              <Link
                href="/portals"
                className="inline-block px-6 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
              >
                {t("enterRegistry")}
              </Link>
            </div>
          );
        })()}

        {dashboard && activeRuns.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dungeonIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-8">
                {activeRuns.map((run) => {
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
                        onExit={handleEnded}
                      />
                    );
                  } else if (d.ruleType === "timed") {
                    card = (
                      <TimedDungeonCard
                        dungeonId={run.dungeonId}
                        initialRun={run}
                        onStreakChange={reload}
                        onExit={handleEnded}
                        onComplete={handleEnded}
                      />
                    );
                  } else if (d.ruleType === "cadence") {
                    card = (
                      <CadenceDungeonCard
                        dungeonId={run.dungeonId}
                        initialRun={run}
                        initialWeekWorkouts={detail.weekWorkouts ?? []}
                        onStreakChange={reload}
                        onExit={handleEnded}
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
                    <SortableDungeonItem key={run.dungeonId} id={run.dungeonId}>
                      {card}
                    </SortableDungeonItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {dashboard && activeRuns.length > 0 && (
          <Link
            href="/portals"
            className="block w-full text-center px-6 py-4 bg-slate-900/60 border border-cyan-500/30 rounded-md text-cyan-300 text-[10px] uppercase tracking-[0.4em] hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all"
          >
            {tDashboardExtra("enterAnother")}
          </Link>
        )}
      </div>
    </main>
  );
}