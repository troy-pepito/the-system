"use server";

import { unstable_cache, updateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  SOCIAL_RECLAIM_RUNGS,
  GYM_LIFE_WORKOUTS,
  DUNGEONS,
  DIMENSION_RANK_MULTIPLIERS,
} from "@/lib/dungeons";
import {
  QUESTS,
  COMBO_THRESHOLD,
  computeComboRuns,
  totalMilestoneXp,
  milestoneIdsForRuns,
  addDaysISO,
  todayLocalISO,
} from "@/lib/quests";
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
  getRank,
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
      select: { type: true, date: true },
    }),
    prisma.questCompletion.findMany({
      where: { userId },
      select: { questId: true, date: true },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekCutoff = new Date(today);
  weekCutoff.setDate(weekCutoff.getDate() - 6);
  const monthCutoff = new Date(today);
  monthCutoff.setDate(monthCutoff.getDate() - 29);

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

  const workoutIds = new Set(GYM_LIFE_WORKOUTS.map((w) => w.id));
  const exposureIds = new Set(SOCIAL_RECLAIM_RUNGS.map((r) => r.id));

  const eventCounts: Record<string, number> = {};
  const rungCounts: Record<string, number> = {};
  let workoutTotal = 0;
  let exposureTotal = 0;
  let weekWorkout = 0;
  let weekExposure = 0;
  let monthWorkout = 0;
  let monthExposure = 0;

  for (const e of events) {
    eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
    const inWeek = e.date >= weekCutoff;
    const inMonth = e.date >= monthCutoff;
    if (workoutIds.has(e.type)) {
      workoutTotal++;
      if (inWeek) weekWorkout++;
      if (inMonth) monthWorkout++;
    }
    if (exposureIds.has(e.type)) {
      exposureTotal++;
      rungCounts[e.type] = (rungCounts[e.type] ?? 0) + 1;
      if (inWeek) weekExposure++;
      if (inMonth) monthExposure++;
    }
  }

  // Perfect quest days: any date where every quest was completed
  const byDate: Record<string, Set<string>> = {};
  const weekByDate: Record<string, Set<string>> = {};
  const monthByDate: Record<string, Set<string>> = {};
  let weekQuestTotal = 0;
  let monthQuestTotal = 0;
  for (const q of quests) {
    const key = q.date.toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = new Set();
    byDate[key].add(q.questId);
    if (q.date >= monthCutoff) {
      monthQuestTotal++;
      if (!monthByDate[key]) monthByDate[key] = new Set();
      monthByDate[key].add(q.questId);
    }
    if (q.date >= weekCutoff) {
      weekQuestTotal++;
      if (!weekByDate[key]) weekByDate[key] = new Set();
      weekByDate[key].add(q.questId);
    }
  }

  const qualifyingDates = Object.entries(byDate)
    .filter(([, set]) => set.size >= COMBO_THRESHOLD)
    .map(([d]) => d)
    .sort();
  const comboRuns = computeComboRuns(qualifyingDates);
  const comboMilestoneXp = totalMilestoneXp(comboRuns);
  const comboMilestoneIds = milestoneIdsForRuns(comboRuns);

  const todayISO = todayLocalISO();
  const yesterdayISO = addDaysISO(todayISO, -1);
  const hasAnyCompletion = Object.keys(byDate).length > 0;
  const scattered = hasAnyCompletion && !byDate[yesterdayISO];
  const perfectQuestDays = Object.values(byDate).filter(
    (set) => set.size >= QUESTS.length
  ).length;
  const weekPerfect = Object.values(weekByDate).filter(
    (set) => set.size >= QUESTS.length
  ).length;
  const monthPerfect = Object.values(monthByDate).filter(
    (set) => set.size >= QUESTS.length
  ).length;

  const activeStreakTotal = Object.values(runsByDungeon).reduce(
    (sum, r) => sum + (r.active ? r.activeStreak : 0),
    0
  );

  let questXpTotal = 0;
  const dimensions = { body: 0, mind: 0, emotion: 0, energy: 0, spirit: 0 };
  for (const q of quests) {
    const def = QUESTS.find((x) => x.id === q.questId);
    if (!def) continue;
    questXpTotal += def.xp;
    dimensions.body += def.body ?? 0;
    dimensions.mind += def.mind ?? 0;
    dimensions.emotion += def.emotion ?? 0;
    dimensions.energy += def.energy ?? 0;
    dimensions.spirit += def.spirit ?? 0;
  }

  for (const d of DUNGEONS) {
    const dims = d.dimensions;
    if (!dims) continue;
    const run = runsByDungeon[d.id];
    if (!run) continue;

    const tierCap =
      d.ruleType === "timed" && d.timed ? d.timed.targetDays : Infinity;

    if (d.tiers) {
      d.tiers.forEach((tier, idx) => {
        if (tier.days > tierCap) return;
        if (run.maxStreak < tier.days) return;
        const mult = DIMENSION_RANK_MULTIPLIERS[idx] ?? 0;
        dimensions.body += (dims.body ?? 0) * mult;
        dimensions.mind += (dims.mind ?? 0) * mult;
        dimensions.emotion += (dims.emotion ?? 0) * mult;
        dimensions.energy += (dims.energy ?? 0) * mult;
        dimensions.spirit += (dims.spirit ?? 0) * mult;
      });
    }

    if (d.progressive) {
      d.progressive.rungs.forEach((rung, idx) => {
        if ((rungCounts[rung.id] ?? 0) < rung.target) return;
        const mult = DIMENSION_RANK_MULTIPLIERS[idx] ?? 0;
        dimensions.body += (dims.body ?? 0) * mult;
        dimensions.mind += (dims.mind ?? 0) * mult;
        dimensions.emotion += (dims.emotion ?? 0) * mult;
        dimensions.energy += (dims.energy ?? 0) * mult;
        dimensions.spirit += (dims.spirit ?? 0) * mult;
      });
    }
  }

  const totalXp =
    activeStreakTotal * XP_PER_STREAK_DAY +
    bankedStreakDays * XP_PER_STREAK_DAY +
    workoutTotal * XP_PER_WORKOUT +
    exposureTotal * XP_PER_EXPOSURE +
    completedRunCount * XP_PER_COMPLETION +
    questXpTotal +
    comboMilestoneXp;

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
    dimensions,
    windows: {
      week: {
        questTotal: weekQuestTotal,
        workoutTotal: weekWorkout,
        exposureTotal: weekExposure,
        perfectQuestDays: weekPerfect,
      },
      month: {
        questTotal: monthQuestTotal,
        workoutTotal: monthWorkout,
        exposureTotal: monthExposure,
        perfectQuestDays: monthPerfect,
      },
    },
    comboMilestoneXp,
    comboMilestoneIds,
    scattered,
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
  for (const id of snapshot.comboMilestoneIds) {
    if (!existingIds.has(id)) newlyUnlocked.push(id);
  }

  if (newlyUnlocked.length > 0) {
    await prisma.achievement.createMany({
      data: newlyUnlocked.map((id) => ({ userId, achievementId: id })),
      skipDuplicates: true,
    });
    updateTag(TAG);
  }

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
    scattered: boolean;
    dimensions: {
      body: number;
      mind: number;
      emotion: number;
      energy: number;
      spirit: number;
    };
    windows: {
      week: {
        questTotal: number;
        workoutTotal: number;
        exposureTotal: number;
        perfectQuestDays: number;
      };
      month: {
        questTotal: number;
        workoutTotal: number;
        exposureTotal: number;
        perfectQuestDays: number;
      };
    };
  };
  unlocked: UnlockedAchievement[];
  heatmap: Record<string, number>;
}

async function _buildHeatmap(userId: string): Promise<Record<string, number>> {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 91);

  const [quests, events] = await Promise.all([
    prisma.questCompletion.findMany({
      where: { userId, date: { gte: cutoff } },
      select: { date: true },
    }),
    prisma.dungeonEvent.findMany({
      where: { run: { userId }, date: { gte: cutoff } },
      select: { date: true },
    }),
  ]);

  const bucket: Record<string, number> = {};
  for (const q of quests) {
    const key = q.date.toISOString().split("T")[0];
    bucket[key] = (bucket[key] ?? 0) + 1;
  }
  for (const e of events) {
    const key = e.date.toISOString().split("T")[0];
    bucket[key] = (bucket[key] ?? 0) + 1;
  }
  return bucket;
}

const getProfilePageDataCached = unstable_cache(
  async (userId: string) => {
    const [snapshot, rows, heatmap] = await Promise.all([
      _buildSnapshot(userId),
      prisma.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
      }),
      _buildHeatmap(userId),
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
        scattered: snapshot.scattered,
        dimensions: snapshot.dimensions,
        windows: snapshot.windows,
      },
      unlocked: rows.map((r) => ({
        id: r.achievementId,
        unlockedAt: r.unlockedAt.toISOString(),
      })),
      heatmap,
    };
  },
  ["profile-page-data"],
  { tags: [TAG] }
);

export async function getProfilePageData(): Promise<ProfilePageData> {
  const userId = await requireUserId();
  return getProfilePageDataCached(userId);
}

export interface PublicDungeonRunSummary {
  dungeonId: string;
  startDate: string | null;
  active: boolean;
  streakDays: number;
}

export interface PublicJournalEntry {
  id: number;
  dungeonId: string;
  type: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface PublicHunterData {
  hunterId: string;
  hunterName: string;
  imageUrl: string | null;
  totalXp: number;
  level: number;
  rank: string;
  activeRuns: PublicDungeonRunSummary[];
  completedRunCount: number;
  workoutTotal: number;
  exposureTotal: number;
  questTotal: number;
  perfectQuestDays: number;
  scattered: boolean;
  dimensions: PlayerSnapshot["dimensions"];
  unlocked: UnlockedAchievement[];
  heatmap: Record<string, number>;
  publicJournal: PublicJournalEntry[];
}

export async function getPublicHunterData(
  hunterId: string
): Promise<PublicHunterData | null> {
  await requireUserId();

  let user;
  try {
    const client = await clerkClient();
    user = await client.users.getUser(hunterId);
  } catch {
    return null;
  }

  const meta = user.unsafeMetadata as { hunterName?: string } | undefined;
  const hunterName =
    meta?.hunterName ||
    user.firstName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Hunter";

  const [snapshot, achievementRows, heatmap, runs, publicEvents] =
    await Promise.all([
      buildSnapshot(hunterId),
      prisma.achievement.findMany({
        where: { userId: hunterId },
        orderBy: { unlockedAt: "desc" },
      }),
      _buildHeatmap(hunterId),
      prisma.dungeonRun.findMany({
        where: { userId: hunterId, active: true },
        orderBy: { createdAt: "desc" },
        select: { dungeonId: true, startDate: true, active: true },
      }),
      prisma.dungeonEvent.findMany({
        where: {
          run: { userId: hunterId },
          isPublic: true,
          note: { not: null },
        },
        include: { run: { select: { dungeonId: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  const activeRuns: PublicDungeonRunSummary[] = runs.map((r) => ({
    dungeonId: r.dungeonId,
    startDate: r.startDate ? r.startDate.toISOString().split("T")[0] : null,
    active: r.active,
    streakDays: r.startDate
      ? computeStreakDays(r.startDate.toISOString())
      : 0,
  }));

  return {
    hunterId,
    hunterName,
    imageUrl: user.imageUrl ?? null,
    totalXp: snapshot.totalXp,
    level: snapshot.level,
    rank: getRank(snapshot.level),
    activeRuns,
    completedRunCount: snapshot.completedRunCount,
    workoutTotal: snapshot.workoutTotal,
    exposureTotal: snapshot.exposureTotal,
    questTotal: snapshot.questTotal,
    perfectQuestDays: snapshot.perfectQuestDays,
    scattered: snapshot.scattered,
    dimensions: snapshot.dimensions,
    unlocked: achievementRows.map((r) => ({
      id: r.achievementId,
      unlockedAt: r.unlockedAt.toISOString(),
    })),
    heatmap,
    publicJournal: publicEvents.map((e) => ({
      id: e.id,
      dungeonId: e.run.dungeonId,
      type: e.type,
      date: e.date.toISOString().split("T")[0],
      note: e.note ?? "",
      createdAt: e.createdAt.toISOString(),
    })),
  };
}