"use server";

import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  DUNGEONS,
  SOCIAL_RECLAIM_RUNGS,
  GYM_LIFE_WORKOUTS,
} from "@/lib/dungeons";
import { QUESTS } from "@/lib/quests";
import {
  ACHIEVEMENTS,
  type PlayerSnapshot,
} from "@/lib/achievements";
import { requireUserId } from "@/lib/auth";

import {
  XP_PER_STREAK_DAY,
  XP_PER_WORKOUT,
  XP_PER_EXPOSURE,
  XP_PER_COMPLETION,
  getLevelFromXp,
  computeStreakDays,
} from "@/lib/player";

const TAG = "player:stats";

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

async function _buildSnapshot(userId: string): Promise<PlayerSnapshot> {
  const [runs, events, quests] = await Promise.all([
    prisma.dungeonRun.findMany({
      where: { userId },
      select: {
        id: true,
        dungeonId: true,
        startDate: true,
        active: true,
        endReason: true,
        updatedAt: true,
      },
    }),
    prisma.dungeonEvent.findMany({
      where: { run: { userId } },
      select: { type: true },
    }),
    prisma.questCompletion.findMany({
      where: { userId },
      select: { questId: true, date: true },
    }),
  ]);

  const runsByDungeon: PlayerSnapshot["runsByDungeon"] = {};
  let activeRunCount = 0;
  let completedRunCount = 0;
  let bankedStreakDays = 0;

  for (const run of runs) {
    const existing = runsByDungeon[run.dungeonId] ?? {
      active: false,
      activeStreak: 0,
      maxStreak: 0,
      completed: false,
    };

    if (run.active) {
      activeRunCount++;
      existing.active = true;
      if (run.startDate) {
        const days = computeStreakDays(run.startDate.toISOString());
        existing.activeStreak = days;
        if (days > existing.maxStreak) existing.maxStreak = days;
      }
    }

    if (!run.active && run.endReason === "completed") {
      completedRunCount++;
      existing.completed = true;
      if (run.startDate) {
        const days = Math.floor(
          (run.updatedAt.getTime() - run.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const safe = Math.max(0, days);
        bankedStreakDays += safe;
        if (safe > existing.maxStreak) existing.maxStreak = safe;
      }
    }

    runsByDungeon[run.dungeonId] = existing;
  }

  const eventCounts: Record<string, number> = {};
  for (const e of events) {
    eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
  }

  const workoutIds = new Set(GYM_LIFE_WORKOUTS.map((w) => w.id));
  const exposureIds = new Set(SOCIAL_RECLAIM_RUNGS.map((r) => r.id));
  let workoutTotal = 0;
  let exposureTotal = 0;
  const rungCounts: Record<string, number> = {};

  for (const [type, count] of Object.entries(eventCounts)) {
    if (workoutIds.has(type)) workoutTotal += count;
    if (exposureIds.has(type)) {
      exposureTotal += count;
      rungCounts[type] = count;
    }
  }

  // Perfect quest days: any date where every quest was completed
  const byDate: Record<string, Set<string>> = {};
  for (const q of quests) {
    const key = q.date.toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = new Set();
    byDate[key].add(q.questId);
  }
  const perfectQuestDays = Object.values(byDate).filter(
    (set) => set.size >= QUESTS.length
  ).length;

  const activeStreakTotal = Object.values(runsByDungeon).reduce(
    (sum, r) => sum + (r.active ? r.activeStreak : 0),
    0
  );

  const totalXp =
    activeStreakTotal * XP_PER_STREAK_DAY +
    bankedStreakDays * XP_PER_STREAK_DAY +
    workoutTotal * XP_PER_WORKOUT +
    exposureTotal * XP_PER_EXPOSURE +
    completedRunCount * XP_PER_COMPLETION +
    quests.reduce((sum, q) => {
      const def = QUESTS.find((x) => x.id === q.questId);
      return sum + (def?.xp ?? 0);
    }, 0);

  const { level } = getLevelFromXp(totalXp);

  return {
    totalXp,
    level,
    activeRunCount,
    runsByDungeon,
    eventCounts,
    workoutTotal,
    exposureTotal,
    rungCounts,
    questTotal: quests.length,
    perfectQuestDays,
    completedRunCount,
  };
}

const buildSnapshot = unstable_cache(
  _buildSnapshot,
  ["build-snapshot"],
  { tags: [TAG] }
);

export async function evaluateAchievements(): Promise<string[]> {
  const userId = await requireUserId();
  const snapshot = await buildSnapshot(userId);
  const existing = await prisma.achievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const existingIds = new Set(existing.map((e) => e.achievementId));

  const newlyUnlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (existingIds.has(def.id)) continue;
    if (def.check(snapshot)) {
      newlyUnlocked.push(def.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    await prisma.achievement.createMany({
      data: newlyUnlocked.map((id) => ({ userId, achievementId: id })),
      skipDuplicates: true,
    });
    updateTag(TAG);
  }

  // Silence unused-import warning: DUNGEONS kept for future criteria.
  void DUNGEONS;

  return newlyUnlocked;
}

const getUnlockedAchievementsCached = unstable_cache(
  async (userId: string) => {
    const rows = await prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.achievementId,
      unlockedAt: r.unlockedAt.toISOString(),
    }));
  },
  ["unlocked-achievements"],
  { tags: [TAG] }
);

export async function getUnlockedAchievements(): Promise<UnlockedAchievement[]> {
  const userId = await requireUserId();
  return getUnlockedAchievementsCached(userId);
}

export async function getProfileStats(): Promise<{
  level: number;
  totalXp: number;
  activeRunCount: number;
  completedRunCount: number;
  workoutTotal: number;
  exposureTotal: number;
  questTotal: number;
  perfectQuestDays: number;
}> {
  const userId = await requireUserId();
  const s = await buildSnapshot(userId);
  return {
    level: s.level,
    totalXp: s.totalXp,
    activeRunCount: s.activeRunCount,
    completedRunCount: s.completedRunCount,
    workoutTotal: s.workoutTotal,
    exposureTotal: s.exposureTotal,
    questTotal: s.questTotal,
    perfectQuestDays: s.perfectQuestDays,
  };
}

export interface ProfilePageData {
  stats: {
    level: number;
    totalXp: number;
    activeRunCount: number;
    completedRunCount: number;
    workoutTotal: number;
    exposureTotal: number;
    questTotal: number;
    perfectQuestDays: number;
  };
  unlocked: UnlockedAchievement[];
}

const getProfilePageDataCached = unstable_cache(
  async (userId: string) => {
    const [snapshot, rows] = await Promise.all([
      _buildSnapshot(userId),
      prisma.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
      }),
    ]);
    return {
      stats: {
        level: snapshot.level,
        totalXp: snapshot.totalXp,
        activeRunCount: snapshot.activeRunCount,
        completedRunCount: snapshot.completedRunCount,
        workoutTotal: snapshot.workoutTotal,
        exposureTotal: snapshot.exposureTotal,
        questTotal: snapshot.questTotal,
        perfectQuestDays: snapshot.perfectQuestDays,
      },
      unlocked: rows.map((r) => ({
        id: r.achievementId,
        unlockedAt: r.unlockedAt.toISOString(),
      })),
    };
  },
  ["profile-page-data"],
  { tags: [TAG] }
);

export async function getProfilePageData(): Promise<ProfilePageData> {
  const userId = await requireUserId();
  return getProfilePageDataCached(userId);
}