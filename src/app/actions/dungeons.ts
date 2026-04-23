"use server";

import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDungeon, DUNGEONS } from "@/lib/dungeons";
import { getTodayCompletions, getLifetimeRewards } from "@/app/actions/quests";
import {
  type QuestRewards,
  COMBO_THRESHOLD,
  computeComboRuns,
  priorComboDays as computePriorComboDays,
  totalMilestoneXp,
  addDaysISO,
} from "@/lib/quests";
import { requireUserId } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import {
  FREE_DUNGEON_LIMIT,
  isPricingEnabled,
  isUserPro,
} from "@/lib/pricing";

const TAG = "player:stats";

export interface DungeonRunState {
  id: number;
  dungeonId: string;
  startDate: string | null;
  active: boolean;
}

export interface RunDetail {
  weekWorkouts?: string[];
  rungCounts?: Record<string, number>;
  monthCount?: number;
}

export interface DashboardData {
  activeRuns: DungeonRunState[];
  bonusXp: {
    workouts: number;
    exposures: number;
    completions: number;
    bankedStreakDays: number;
  };
  details: Record<string, RunDetail>;
  todayQuestIds: string[];
  lifetimeRewards: QuestRewards;
  priorComboDays: number;
  milestoneXp: number;
  scattered: boolean;
}

function toState(run: {
  id: number;
  dungeonId: string;
  startDate: Date | null;
  active: boolean;
}): DungeonRunState {
  return {
    id: run.id,
    dungeonId: run.dungeonId,
    startDate: run.startDate ? run.startDate.toISOString().split("T")[0] : null,
    active: run.active,
  };
}

const getActiveRunCached = unstable_cache(
  async (userId: string, dungeonId: string) => {
    const run = await prisma.dungeonRun.findFirst({
      where: { userId, dungeonId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return run ? toState(run) : null;
  },
  ["active-run"],
  { tags: [TAG] }
);

export async function getActiveRun(
  dungeonId: string
): Promise<DungeonRunState | null> {
  const userId = await requireUserId();
  return getActiveRunCached(userId, dungeonId);
}

const getAllActiveRunsCached = unstable_cache(
  async (userId: string) => {
    const runs = await prisma.dungeonRun.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return runs.map(toState);
  },
  ["all-active-runs"],
  { tags: [TAG] }
);

export async function getAllActiveRuns(): Promise<DungeonRunState[]> {
  const userId = await requireUserId();
  return getAllActiveRunsCached(userId);
}

const getComboStateCached = unstable_cache(
  async (userId: string, todayIso: string) => {
    const rows = await prisma.questCompletion.findMany({
      where: { userId },
      select: { questId: true, date: true },
    });
    const byDate: Record<string, Set<string>> = {};
    for (const r of rows) {
      const key = r.date.toISOString().split("T")[0];
      if (!byDate[key]) byDate[key] = new Set();
      byDate[key].add(r.questId);
    }
    const allQualifying = Object.entries(byDate)
      .filter(([, set]) => set.size >= COMBO_THRESHOLD)
      .map(([d]) => d)
      .sort();
    const pastQualifying = allQualifying.filter((d) => d < todayIso);
    const runs = computeComboRuns(allQualifying);
    const pastRuns = computeComboRuns(pastQualifying);

    const yesterdayIso = addDaysISO(todayIso, -1);
    const hasAnyCompletion = Object.keys(byDate).length > 0;
    const scattered = hasAnyCompletion && !byDate[yesterdayIso];

    return {
      priorComboDays: computePriorComboDays(pastRuns, todayIso),
      milestoneXp: totalMilestoneXp(runs),
      scattered,
    };
  },
  ["combo-state"],
  { tags: [TAG] }
);

async function getComboState(todayIso: string): Promise<{
  priorComboDays: number;
  milestoneXp: number;
  scattered: boolean;
}> {
  const userId = await requireUserId();
  return getComboStateCached(userId, todayIso);
}

export async function getDashboardData(
  todayIso: string
): Promise<DashboardData> {
  const [activeRuns, bonusXp, todayQuestIds, lifetimeRewards, comboState] =
    await Promise.all([
      getAllActiveRuns(),
      getBonusXp(),
      getTodayCompletions(todayIso),
      getLifetimeRewards(),
      getComboState(todayIso),
    ]);

  const detailEntries = await Promise.all(
    activeRuns.map(async (run): Promise<[string, RunDetail]> => {
      const d = getDungeon(run.dungeonId);
      const detail: RunDetail = {};
      if (!d) return [run.dungeonId, detail];

      if (d.ruleType === "cadence") {
        detail.weekWorkouts = await getWeekWorkouts(run.dungeonId);
      } else if (d.ruleType === "progressive") {
        detail.rungCounts = await getRungCounts(run.dungeonId);
      } else if (d.ruleType === "allowance" && d.allowance) {
        detail.monthCount = await getMonthEventCount(
          run.dungeonId,
          d.allowance.unitLabel
        );
      }
      return [run.dungeonId, detail];
    })
  );

  return {
    activeRuns,
    bonusXp,
    details: Object.fromEntries(detailEntries),
    todayQuestIds,
    lifetimeRewards,
    priorComboDays: comboState.priorComboDays,
    milestoneXp: comboState.milestoneXp,
    scattered: comboState.scattered,
  };
}

export async function enterDungeon(
  dungeonId: string
): Promise<DungeonRunState> {
  const userId = await requireUserId();
  const existing = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  if (existing) return toState(existing);

  if (isPricingEnabled()) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userIsPro = isUserPro(user);
    if (!userIsPro) {
      const activeCount = await prisma.dungeonRun.count({
        where: { userId, active: true },
      });
      if (activeCount >= FREE_DUNGEON_LIMIT) {
        throw new Error("PAYWALL");
      }
    }
  }

  const run = await prisma.dungeonRun.create({
    data: { userId, dungeonId, active: true },
  });
  updateTag(TAG);
  return toState(run);
}

export async function setRunStartDate(
  dungeonId: string,
  dateIso: string
): Promise<DungeonRunState> {
  const userId = await requireUserId();
  const existing = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  const date = new Date(dateIso);
  if (existing) {
    const updated = await prisma.dungeonRun.update({
      where: { id: existing.id },
      data: { startDate: date },
    });
    updateTag(TAG);
    return toState(updated);
  }
  const run = await prisma.dungeonRun.create({
    data: { userId, dungeonId, startDate: date, active: true },
  });
  updateTag(TAG);
  return toState(run);
}

export async function endRun(
  dungeonId: string,
  reason: "relapse" | "completed"
): Promise<void> {
  const userId = await requireUserId();
  await prisma.dungeonRun.updateMany({
    where: { userId, dungeonId, active: true },
    data: { active: false, endReason: reason },
  });
  updateTag(TAG);
}

function currentMonthBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return { start, end };
}

function currentWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay();
  const offsetToMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - offsetToMonday
    )
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

const getWeekWorkoutsCached = unstable_cache(
  async (userId: string, dungeonId: string) => {
    const run = await prisma.dungeonRun.findFirst({
      where: { userId, dungeonId, active: true },
    });
    if (!run) return [];
    const { start, end } = currentWeekBounds();
    const events = await prisma.dungeonEvent.findMany({
      where: { runId: run.id, date: { gte: start, lt: end } },
      select: { type: true },
      distinct: ["type"],
    });
    return events.map((e) => e.type);
  },
  ["week-workouts"],
  { tags: [TAG] }
);

export async function getWeekWorkouts(dungeonId: string): Promise<string[]> {
  const userId = await requireUserId();
  return getWeekWorkoutsCached(userId, dungeonId);
}

export async function toggleWorkout(
  dungeonId: string,
  workoutType: string
): Promise<{ completed: boolean }> {
  const userId = await requireUserId();
  const run = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  if (!run) throw new Error(`No active run for ${dungeonId}`);

  const { start, end } = currentWeekBounds();
  const existing = await prisma.dungeonEvent.findFirst({
    where: {
      runId: run.id,
      type: workoutType,
      date: { gte: start, lt: end },
    },
  });

  if (existing) {
    await prisma.dungeonEvent.deleteMany({
      where: {
        runId: run.id,
        type: workoutType,
        date: { gte: start, lt: end },
      },
    });
    updateTag(TAG);
    return { completed: false };
  }

  await prisma.dungeonEvent.create({
    data: { runId: run.id, type: workoutType, date: new Date() },
  });
  updateTag(TAG);
  return { completed: true };
}

const getMonthEventCountCached = unstable_cache(
  async (userId: string, dungeonId: string, type: string) => {
    const run = await prisma.dungeonRun.findFirst({
      where: { userId, dungeonId, active: true },
    });
    if (!run) return 0;
    const { start, end } = currentMonthBounds();
    return prisma.dungeonEvent.count({
      where: { runId: run.id, type, date: { gte: start, lt: end } },
    });
  },
  ["month-event-count"],
  { tags: [TAG] }
);

export async function getMonthEventCount(
  dungeonId: string,
  type: string
): Promise<number> {
  const userId = await requireUserId();
  return getMonthEventCountCached(userId, dungeonId, type);
}

const getBonusXpCached = unstable_cache(
  async (userId: string) => {
    const workoutIds = Array.from(
      new Set(
        DUNGEONS.flatMap((d) => d.cadence?.workouts.map((w) => w.id) ?? [])
      )
    );
    const exposureIds = Array.from(
      new Set(
        DUNGEONS.flatMap((d) => d.progressive?.rungs.map((r) => r.id) ?? [])
      )
    );

    const [workoutCount, exposureCount, completedRuns] = await Promise.all([
      workoutIds.length > 0
        ? prisma.dungeonEvent.count({
            where: { type: { in: workoutIds }, run: { userId } },
          })
        : Promise.resolve(0),
      exposureIds.length > 0
        ? prisma.dungeonEvent.count({
            where: { type: { in: exposureIds }, run: { userId } },
          })
        : Promise.resolve(0),
      prisma.dungeonRun.findMany({
        where: { userId, active: false, endReason: "completed" },
        select: { startDate: true, updatedAt: true },
      }),
    ]);

    const bankedStreakDays = completedRuns.reduce((sum, run) => {
      if (!run.startDate) return sum;
      const days = Math.floor(
        (run.updatedAt.getTime() - run.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + Math.max(0, days);
    }, 0);

    return {
      workouts: workoutCount,
      exposures: exposureCount,
      completions: completedRuns.length,
      bankedStreakDays,
    };
  },
  ["bonus-xp"],
  { tags: [TAG] }
);

export async function getBonusXp(): Promise<{
  workouts: number;
  exposures: number;
  completions: number;
  bankedStreakDays: number;
}> {
  const userId = await requireUserId();
  return getBonusXpCached(userId);
}

const getRungCountsCached = unstable_cache(
  async (userId: string, dungeonId: string) => {
    const run = await prisma.dungeonRun.findFirst({
      where: { userId, dungeonId, active: true },
    });
    if (!run) return {} as Record<string, number>;
    const events = await prisma.dungeonEvent.groupBy({
      by: ["type"],
      where: { runId: run.id },
      _count: { type: true },
    });
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.type] = e._count.type;
    }
    return counts;
  },
  ["rung-counts"],
  { tags: [TAG] }
);

export async function getRungCounts(
  dungeonId: string
): Promise<Record<string, number>> {
  const userId = await requireUserId();
  return getRungCountsCached(userId, dungeonId);
}

export async function logRungExposure(
  dungeonId: string,
  rungId: string
): Promise<{ count: number; rungCleared: boolean; dungeonCleared: boolean }> {
  const userId = await requireUserId();
  const dungeon = getDungeon(dungeonId);
  if (!dungeon?.progressive) {
    throw new Error(`Dungeon ${dungeonId} has no progressive config`);
  }
  const rung = dungeon.progressive.rungs.find((r) => r.id === rungId);
  if (!rung) throw new Error(`Unknown rung ${rungId}`);

  const run = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  if (!run) throw new Error(`No active run for ${dungeonId}`);

  await prisma.dungeonEvent.create({
    data: { runId: run.id, type: rungId, date: new Date(), value: 1 },
  });

  const count = await prisma.dungeonEvent.count({
    where: { runId: run.id, type: rungId },
  });
  const rungCleared = count >= rung.target;

  let dungeonCleared = false;
  if (rungCleared) {
    const allCounts = await prisma.dungeonEvent.groupBy({
      by: ["type"],
      where: { runId: run.id },
      _count: { type: true },
    });
    const countMap: Record<string, number> = {};
    for (const e of allCounts) countMap[e.type] = e._count.type;
    dungeonCleared = dungeon.progressive.rungs.every(
      (r) => (countMap[r.id] ?? 0) >= r.target
    );
    if (dungeonCleared) {
      await prisma.dungeonRun.update({
        where: { id: run.id },
        data: { active: false, endReason: "completed" },
      });
    }
  }

  updateTag(TAG);
  return { count, rungCleared, dungeonCleared };
}

export async function undoRungExposure(
  dungeonId: string,
  rungId: string
): Promise<{ count: number }> {
  const userId = await requireUserId();
  const run = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  if (!run) throw new Error(`No active run for ${dungeonId}`);

  const last = await prisma.dungeonEvent.findFirst({
    where: { runId: run.id, type: rungId },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    await prisma.dungeonEvent.delete({ where: { id: last.id } });
  }
  const count = await prisma.dungeonEvent.count({
    where: { runId: run.id, type: rungId },
  });
  updateTag(TAG);
  return { count };
}

export async function logAllowanceEvent(
  dungeonId: string,
  type: string
): Promise<{ count: number; relapsed: boolean }> {
  const userId = await requireUserId();
  const dungeon = getDungeon(dungeonId);
  if (!dungeon?.allowance) {
    throw new Error(`Dungeon ${dungeonId} has no allowance config`);
  }
  const run = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  if (!run) throw new Error(`No active run for ${dungeonId}`);

  const now = new Date();
  await prisma.dungeonEvent.create({
    data: { runId: run.id, type, date: now, value: 1 },
  });

  const { start, end } = currentMonthBounds();
  const count = await prisma.dungeonEvent.count({
    where: { runId: run.id, type, date: { gte: start, lt: end } },
  });

  if (count > dungeon.allowance.limit) {
    await prisma.dungeonRun.update({
      where: { id: run.id },
      data: { active: false, endReason: "relapse" },
    });
    updateTag(TAG);
    return { count, relapsed: true };
  }
  updateTag(TAG);
  return { count, relapsed: false };
}