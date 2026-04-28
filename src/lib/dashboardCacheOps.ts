import { readCache, writeCache } from "@/lib/offlineCache";
import { todayLocalISO } from "@/lib/quests";
import type { DashboardData, RunDetail } from "@/app/actions/dungeons";

export const dashboardCacheKey = (date: string) => `dashboard:${date}`;

function mutate(fn: (d: DashboardData) => DashboardData): void {
  const key = dashboardCacheKey(todayLocalISO());
  const current = readCache<DashboardData>(key);
  if (!current) return;
  writeCache(key, fn(current));
}

function withDetail(
  data: DashboardData,
  dungeonId: string,
  update: (d: RunDetail) => RunDetail
): DashboardData {
  const existing = data.details[dungeonId] ?? {};
  return {
    ...data,
    details: { ...data.details, [dungeonId]: update(existing) },
  };
}

export function endRunInCache(dungeonId: string): void {
  mutate((d) => ({
    ...d,
    activeRuns: d.activeRuns.filter((r) => r.dungeonId !== dungeonId),
    details: { ...d.details, [dungeonId]: {} },
  }));
}

export function addRunToCache(dungeonId: string, startDate: string | null): void {
  mutate((d) => {
    if (d.activeRuns.some((r) => r.dungeonId === dungeonId)) return d;
    return {
      ...d,
      activeRuns: [
        ...d.activeRuns,
        { id: -Date.now(), dungeonId, startDate, active: true },
      ],
    };
  });
}

export function setRunStartDateInCache(
  dungeonId: string,
  dateIso: string
): void {
  mutate((d) => {
    const existing = d.activeRuns.find((r) => r.dungeonId === dungeonId);
    if (existing) {
      return {
        ...d,
        activeRuns: d.activeRuns.map((r) =>
          r.dungeonId === dungeonId ? { ...r, startDate: dateIso } : r
        ),
      };
    }
    return {
      ...d,
      activeRuns: [
        ...d.activeRuns,
        { id: -Date.now(), dungeonId, startDate: dateIso, active: true },
      ],
    };
  });
}

export function setWorkoutInCache(
  dungeonId: string,
  workoutId: string,
  done: boolean
): void {
  mutate((d) =>
    withDetail(d, dungeonId, (detail) => {
      const existing = detail.weekWorkouts ?? [];
      const next = done
        ? Array.from(new Set([...existing, workoutId]))
        : existing.filter((w) => w !== workoutId);
      return { ...detail, weekWorkouts: next };
    })
  );
}

export function bumpAllowanceInCache(dungeonId: string, delta: number): void {
  mutate((d) =>
    withDetail(d, dungeonId, (detail) => ({
      ...detail,
      monthCount: Math.max(0, (detail.monthCount ?? 0) + delta),
    }))
  );
}

export function adjustRungCountInCache(
  dungeonId: string,
  rungId: string,
  delta: number
): void {
  mutate((d) =>
    withDetail(d, dungeonId, (detail) => {
      const counts = { ...(detail.rungCounts ?? {}) };
      counts[rungId] = Math.max(0, (counts[rungId] ?? 0) + delta);
      return { ...detail, rungCounts: counts };
    })
  );
}