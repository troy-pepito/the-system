"use server";

import { unstable_cache, updateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  SOCIAL_RECLAIM_RUNGS,
  GYM_LIFE_WORKOUTS,
  DUNGEONS,
  DIMENSION_RANK_MULTIPLIERS,
  TIER_BONUS_XP,
  TIER_PER_ACTION_BONUS,
} from "@/lib/dungeons";
import {
  QUESTS,
  SIDE_QUESTS,
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
  const [runs, events, quests, allCheckIns] = await Promise.all([
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
    prisma.dungeonDayCheckIn.findMany({
      where: { userId },
      select: { dungeonId: true, date: true, state: true, confirmedAt: true },
      orderBy: { confirmedAt: "desc" },
    }),
  ]);

  const checkInDungeons = new Set(
    DUNGEONS.filter(
      (d) => d.ruleType === "continuous_streak" || d.ruleType === "timed"
    ).map((d) => d.id)
  );
  // Dedupe by (dungeonId, date) so re-entering a dungeon and re-clearing
  // the same calendar day doesn't double-count XP. Latest confirmedAt
  // wins (records are ordered desc) → most recent state per date is the
  // source of truth.
  const latestState = new Map<string, string>();
  for (const c of allCheckIns) {
    const key = `${c.dungeonId}|${c.date.toISOString().split("T")[0]}`;
    if (!latestState.has(key)) latestState.set(key, c.state);
  }
  const clearedDays: Record<string, number> = {};
  for (const [key, state] of latestState) {
    if (state !== "cleared") continue;
    const dungeonId = key.split("|")[0];
    clearedDays[dungeonId] = (clearedDays[dungeonId] ?? 0) + 1;
  }

  // Only timed (Claim Victory after target days) and progressive
  // (final rung cleared) dungeons can legitimately complete. Anything
  // else with endReason="completed" is a leftover from when Exit Dungeon
  // mistakenly used reason:"completed" — count those as walk-aways.
  const canTrulyComplete = (dungeonId: string): boolean => {
    const d = DUNGEONS.find((x) => x.id === dungeonId);
    return d?.ruleType === "timed" || d?.ruleType === "progressive";
  };

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
    const usesCheckIns = checkInDungeons.has(run.dungeonId);

    if (run.active) {
      activeRunCount++;
      existing.active = true;
      if (run.startDate && !usesCheckIns) {
        const days = computeStreakDays(run.startDate.toISOString());
        existing.activeStreak = days;
        if (days > existing.maxStreak) existing.maxStreak = days;
      }
    }

    if (
      !run.active &&
      run.endReason === "completed" &&
      canTrulyComplete(run.dungeonId)
    ) {
      completedRunCount++;
      existing.completed = true;
      if (run.startDate && !usesCheckIns) {
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

  for (const dungeonId of Object.keys(clearedDays)) {
    const count = clearedDays[dungeonId];
    const existing = runsByDungeon[dungeonId] ?? {
      active: false,
      activeStreak: 0,
      maxStreak: 0,
      completed: false,
    };
    if (count > existing.maxStreak) existing.maxStreak = count;
    runsByDungeon[dungeonId] = existing;
  }
  const checkInXpDays = Object.entries(clearedDays).reduce(
    (sum, [id, n]) => sum + (checkInDungeons.has(id) ? n : 0),
    0
  );

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
  // Dedupe workouts by (type, date) so duplicate events left over from
  // exit/re-enter cycles (where the same workout type was logged in
  // separate runIds for the same calendar day) don't double-count XP.
  const seenWorkoutDay = new Set<string>();

  for (const e of events) {
    eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
    const inWeek = e.date >= weekCutoff;
    const inMonth = e.date >= monthCutoff;
    if (workoutIds.has(e.type)) {
      const dayKey = `${e.type}|${e.date.toISOString().split("T")[0]}`;
      if (seenWorkoutDay.has(dayKey)) continue;
      seenWorkoutDay.add(dayKey);
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

  // Perfect quest days: any date where every quest was completed.
  // Side quests are excluded from these sets so they don't fake-inflate
  // perfect-day or combo counts on rare-quest days.
  const sideQuestIds = new Set(SIDE_QUESTS.map((q) => q.id));
  const byDate: Record<string, Set<string>> = {};
  const weekByDate: Record<string, Set<string>> = {};
  const monthByDate: Record<string, Set<string>> = {};
  let weekQuestTotal = 0;
  let monthQuestTotal = 0;
  for (const q of quests) {
    const key = q.date.toISOString().split("T")[0];
    const isDaily = !sideQuestIds.has(q.questId);
    if (isDaily) {
      if (!byDate[key]) byDate[key] = new Set();
      byDate[key].add(q.questId);
    }
    if (q.date >= monthCutoff) {
      monthQuestTotal++;
      if (isDaily) {
        if (!monthByDate[key]) monthByDate[key] = new Set();
        monthByDate[key].add(q.questId);
      }
    }
    if (q.date >= weekCutoff) {
      weekQuestTotal++;
      if (isDaily) {
        if (!weekByDate[key]) weekByDate[key] = new Set();
        weekByDate[key].add(q.questId);
      }
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
    const def =
      QUESTS.find((x) => x.id === q.questId) ??
      SIDE_QUESTS.find((x) => x.id === q.questId);
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

    if (checkInDungeons.has(d.id)) {
      const cleared = clearedDays[d.id] ?? 0;
      dimensions.body += (dims.body ?? 0) * cleared;
      dimensions.mind += (dims.mind ?? 0) * cleared;
      dimensions.emotion += (dims.emotion ?? 0) * cleared;
      dimensions.energy += (dims.energy ?? 0) * cleared;
      dimensions.spirit += (dims.spirit ?? 0) * cleared;
    }

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

  // Dungeon tier scaling: every dungeon gets the same shape of reward.
  //   - Tier crossing bonus: a one-time XP credit for each tier the
  //     player has reached in this dungeon (cumulative E → S, capped
  //     at S = +3200).
  //   - Per-action scaling: existing per-action XP gets a bonus added,
  //     scaled by the highest tier currently reached. Capped at +30
  //     per action at S rank.
  // Allowance dungeons get tier bonuses only (no positive action — the
  // user earns by NOT consuming, so per-action scaling doesn't apply).
  let dungeonTierBonusTotal = 0;
  let dungeonPerActionBonusTotal = 0;

  for (const d of DUNGEONS) {
    const run = runsByDungeon[d.id];
    if (!run) continue;

    let tierIdx = -1;
    let actionCount = 0;

    if (d.ruleType === "continuous_streak" || d.ruleType === "timed") {
      const cleared = clearedDays[d.id] ?? 0;
      if (d.tiers) {
        const tierCap =
          d.ruleType === "timed" && d.timed ? d.timed.targetDays : Infinity;
        const validTiers = d.tiers.filter((t) => t.days <= tierCap);
        tierIdx = validTiers.filter((t) => cleared >= t.days).length - 1;
      }
      actionCount = cleared;
    } else if (d.ruleType === "cadence") {
      if (d.tiers) {
        tierIdx =
          d.tiers.filter((t) => run.maxStreak >= t.days).length - 1;
      }
      // Single cadence dungeon today (Training Regimen) — workouts ≈
      // workoutTotal. Update if multiple cadence dungeons are added.
      actionCount = workoutTotal;
    } else if (d.ruleType === "allowance") {
      if (d.tiers) {
        tierIdx =
          d.tiers.filter((t) => run.maxStreak >= t.days).length - 1;
      }
      // Passive — no per-action XP.
      actionCount = 0;
    } else if (d.ruleType === "progressive" && d.progressive) {
      let clearedRungs = 0;
      for (const rung of d.progressive.rungs) {
        if ((rungCounts[rung.id] ?? 0) >= rung.target) clearedRungs++;
      }
      tierIdx = clearedRungs - 1;
      // Single progressive dungeon (Exposure Therapy) — exposures ≈
      // exposureTotal. Update if multiple progressive dungeons added.
      actionCount = exposureTotal;
    }

    for (let i = 0; i <= tierIdx; i++) {
      dungeonTierBonusTotal += TIER_BONUS_XP[i] ?? 0;
    }
    if (tierIdx >= 0 && actionCount > 0) {
      const scale = TIER_PER_ACTION_BONUS[tierIdx] ?? 0;
      dungeonPerActionBonusTotal += actionCount * scale;
    }
  }

  const totalXp =
    activeStreakTotal * XP_PER_STREAK_DAY +
    bankedStreakDays * XP_PER_STREAK_DAY +
    checkInXpDays * XP_PER_STREAK_DAY +
    workoutTotal * XP_PER_WORKOUT +
    exposureTotal * XP_PER_EXPOSURE +
    completedRunCount * XP_PER_COMPLETION +
    questXpTotal +
    comboMilestoneXp +
    dungeonTierBonusTotal +
    dungeonPerActionBonusTotal;

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

/**
 * Public version for cross-module use (e.g. friends.ts) — returns the
 * authoritative level + rank for any user. Other modules MUST use this
 * instead of recomputing XP locally to avoid drift between views.
 */
export async function getPlayerLevelForUser(
  userId: string
): Promise<{ level: number; rank: string; totalXp: number }> {
  const snap = await buildSnapshot(userId);
  return { level: snap.level, rank: getRank(snap.level), totalXp: snap.totalXp };
}

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
  /** Pre-computed ruleType-aware display, e.g. "12d cleared",
   *  "3/5 this week", "Acknowledge 4/7", "1/4 sweets". */
  displayValue: string;
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfUtcWeekMonday(d: Date): Date {
  const today = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const day = today.getUTCDay();
  const offset = (day + 6) % 7;
  return new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
}

async function computeRunDisplayValue(run: {
  id: number;
  dungeonId: string;
  startDate: Date | null;
}): Promise<string> {
  const d = DUNGEONS.find((x) => x.id === run.dungeonId);
  if (!d) return "—";
  const now = new Date();

  if (d.ruleType === "continuous_streak" || d.ruleType === "timed") {
    const cleared = await prisma.dungeonDayCheckIn.count({
      where: { runId: run.id, state: "cleared" },
    });
    return `${cleared}d cleared`;
  }

  if (d.ruleType === "cadence") {
    const target = d.cadence?.weeklyTarget ?? 5;
    const weekStart = startOfUtcWeekMonday(now);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = await prisma.dungeonEvent.count({
      where: {
        runId: run.id,
        date: { gte: weekStart, lt: weekEnd },
      },
    });
    return `${count}/${target} this week`;
  }

  if (d.ruleType === "progressive" && d.progressive) {
    const rungs = d.progressive.rungs;
    const counts = await prisma.dungeonEvent.groupBy({
      by: ["type"],
      where: { runId: run.id },
      _count: { type: true },
    });
    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c.type] = c._count.type;
    const currentRung =
      rungs.find((r) => (countMap[r.id] ?? 0) < r.target) ??
      rungs[rungs.length - 1];
    const c = countMap[currentRung.id] ?? 0;
    return `${currentRung.name} ${Math.min(c, currentRung.target)}/${currentRung.target}`;
  }

  if (d.ruleType === "allowance" && d.allowance) {
    const monthStart = startOfUtcMonth(now);
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );
    const count = await prisma.dungeonEvent.count({
      where: {
        runId: run.id,
        type: d.allowance.unitLabel,
        date: { gte: monthStart, lt: monthEnd },
      },
    });
    const unit =
      count === 1 ? d.allowance.unitLabel : d.allowance.unitLabelPlural;
    return `${count}/${d.allowance.limit} ${unit}`;
  }

  return "—";
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
        select: { id: true, dungeonId: true, startDate: true, active: true },
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

  const activeRuns: PublicDungeonRunSummary[] = await Promise.all(
    runs.map(async (r) => ({
      dungeonId: r.dungeonId,
      startDate: r.startDate ? r.startDate.toISOString().split("T")[0] : null,
      active: r.active,
      displayValue: await computeRunDisplayValue(r),
    }))
  );

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