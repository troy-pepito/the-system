"use server";

import { unstable_cache, updateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  DUNGEONS,
  DIMENSION_RANK_MULTIPLIERS,
  TIER_BONUS_XP,
  TIER_PER_ACTION_BONUS,
  CADENCE_FULL_CLEAR_BONUS_XP,
} from "@/lib/dungeons";
import {
  QUESTS,
  SIDE_QUESTS,
  COMBO_THRESHOLD,
  PERFECT_DAY_BONUS_XP,
  computeComboRuns,
  totalMilestoneXp,
  milestoneIdsForRuns,
  addDaysISO,
  todayLocalISO,
  highestMilestoneIdx,
  comboBonusPerQuest,
} from "@/lib/quests";
import {
  ACHIEVEMENTS,
  TROPHY_XP_BY_RARITY,
  isComboAchievementId,
  type PlayerSnapshot,
} from "@/lib/achievements";
import { ACTIVITY_POINTS } from "@/lib/leaderboard";
import { resolveHunterDisplay } from "@/lib/hunterDisplay";
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
  /** ISO string when the player tapped Claim and was awarded XP. null = unclaimed. */
  claimedAt: string | null;
}

async function _buildSnapshot(userId: string): Promise<PlayerSnapshot> {
  // Defer weekCutoff calc to inline below; we need it for the parallel
  // weekly check-in count too.
  const _now = new Date();
  _now.setHours(0, 0, 0, 0);
  const weekCutoffEarly = new Date(_now);
  weekCutoffEarly.setDate(weekCutoffEarly.getDate() - 6);

  const [
    runs,
    events,
    quests,
    allCheckIns,
    claimedTrophies,
    weekClearedDays,
    // Community trophy data, all small per-user reads.
    publicReflections,
    friendCount,
    guildMemberCount,
    checkInDates,
  ] = await Promise.all([
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
      select: {
        type: true,
        date: true,
        run: { select: { dungeonId: true } },
      },
    }),
    prisma.questCompletion.findMany({
      where: { userId },
      select: { questId: true, date: true },
    }),
    prisma.dungeonDayCheckIn.groupBy({
      by: ["dungeonId"],
      where: { userId, state: "cleared" },
      _count: { _all: true },
    }),
    // Claimed trophies, XP source. Unclaimed rows don't contribute
    // to totalXp until the player taps Claim, then this list grows
    // and the next snapshot includes the rarity-mapped XP.
    prisma.achievement.findMany({
      where: { userId, claimedAt: { not: null } },
      select: { achievementId: true },
    }),
    // Weekly cleared-day count, feeds the leaderboard activity-points
    // calc (1pt per cleared day per ACTIVITY_POINTS.dayCleared). Done
    // as a separate count rather than reading allCheckIns rows so the
    // existing groupBy stays cheap.
    prisma.dungeonDayCheckIn.count({
      where: {
        userId,
        state: "cleared",
        date: { gte: weekCutoffEarly },
      },
    }),
    // Public reflections, counts toward Hunter's Voice / Open Hand.
    // Filter: events tied to user's runs with a note and isPublic=true.
    prisma.dungeonEvent.count({
      where: {
        run: { userId },
        note: { not: null },
        isPublic: true,
      },
    }),
    // Friends count, accepted both directions. Powers First Bond
    // and Five Bonds.
    prisma.friendship.count({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
    }),
    // Has the hunter ever been an accepted member of a guild? Powers
    // Bond Found. Requires status="accepted" so a stale pending
    // join-request doesn't pre-unlock the trophy before the owner
    // actually approves. Creating a guild still unlocks: createGuild
    // writes the owner's own row with status="accepted" in the same
    // transaction.
    prisma.guildMember.count({
      where: { userId, status: "accepted" },
    }),
    // Distinct check-in dates, joined with quest + event dates below
    // to compute distinctActivityDays for Daily Witness.
    prisma.dungeonDayCheckIn.findMany({
      where: { userId, state: "cleared" },
      select: { date: true },
    }),
  ]);

  const checkInDungeons = new Set(
    DUNGEONS.filter(
      (d) => d.ruleType === "continuous_streak" || d.ruleType === "timed"
    ).map((d) => d.id)
  );
  // The DB unique on (userId, dungeonId, date) guarantees one row per
  // day per dungeon, so a straight count of state="cleared" is exact.
  const clearedDays: Record<string, number> = {};
  for (const row of allCheckIns) {
    clearedDays[row.dungeonId] = row._count._all;
  }

  // Only timed (Claim Victory after target days) and progressive
  // (final rung cleared) dungeons can legitimately complete. Anything
  // else with endReason="completed" is a leftover from when Exit Dungeon
  // mistakenly used reason:"completed", count those as walk-aways.
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

    // For non-checkIn dungeons (cadence + progressive), maxStreak
    // tracks the longest calendar-day streak the player has held.
    // Bumping it on EVERY non-active run preserves tier rank across
    // exits and relapses, without this, exiting Training Regimen at
    // day 60 (B rank) wipes the tier bonus on the next snapshot.
    if (!run.active && run.startDate && !usesCheckIns) {
      const days = Math.floor(
        (run.updatedAt.getTime() - run.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const safe = Math.max(0, days);
      if (safe > existing.maxStreak) existing.maxStreak = safe;
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
        bankedStreakDays += Math.max(0, days);
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

  // Sourced from DUNGEONS so any new cadence/progressive dungeon
  // automatically participates in workout/exposure XP. Hardcoding to a
  // single dungeon's task list silently dropped XP for the starter
  // routines that landed alongside Hunter Types.
  const workoutIds = new Set<string>(
    DUNGEONS.flatMap((d) =>
      d.ruleType === "cadence"
        ? d.cadence?.workouts.map((w) => w.id) ?? []
        : []
    )
  );
  const exposureIds = new Set<string>(
    DUNGEONS.flatMap((d) =>
      d.ruleType === "progressive"
        ? d.progressive?.rungs.map((r) => r.id) ?? []
        : []
    )
  );

  const eventCounts: Record<string, number> = {};
  const rungCounts: Record<string, number> = {};
  // Per-dungeon action counts. Tier per-action bonus reads from these
  // so multiple cadence/progressive dungeons each scale on their own
  // event volume, not the global total (which 6×-counted before).
  const workoutsByDungeon: Record<string, number> = {};
  const exposuresByDungeon: Record<string, number> = {};
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
    const dungeonId = e.run.dungeonId;
    if (workoutIds.has(e.type)) {
      const dayKey = `${e.type}|${e.date.toISOString().split("T")[0]}`;
      if (seenWorkoutDay.has(dayKey)) continue;
      seenWorkoutDay.add(dayKey);
      workoutTotal++;
      workoutsByDungeon[dungeonId] = (workoutsByDungeon[dungeonId] ?? 0) + 1;
      if (inWeek) weekWorkout++;
      if (inMonth) monthWorkout++;
    }
    if (exposureIds.has(e.type)) {
      exposureTotal++;
      exposuresByDungeon[dungeonId] =
        (exposuresByDungeon[dungeonId] ?? 0) + 1;
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
  // Split daily vs side for the leaderboard, daily quests are 1pt
  // each (baseline morning routine) while side quests weigh more
  // (intentional, less frequent).
  let weekDailyQuests = 0;
  let weekSideQuests = 0;
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
      if (isDaily) weekDailyQuests++;
      else weekSideQuests++;
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

  // Per-quest bonus from the player's highest combo milestone, sticky
  // across runs, mirrors the dungeon tier-per-action scaling so a long
  // habit streak makes every daily quest land harder. Side quests get
  // the base xp only since they're already big special-event rewards.
  const questBonus = comboBonusPerQuest(highestMilestoneIdx(comboRuns));
  const dailyQuestIds = new Set(QUESTS.map((q) => q.id));

  let questXpTotal = 0;
  const dimensions = { body: 0, mind: 0, emotion: 0, energy: 0, spirit: 0 };
  for (const q of quests) {
    const def =
      QUESTS.find((x) => x.id === q.questId) ??
      SIDE_QUESTS.find((x) => x.id === q.questId);
    if (!def) continue;
    const isDailyQuest = dailyQuestIds.has(q.questId);
    questXpTotal += def.xp + (isDailyQuest ? questBonus : 0);
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
      // Per-dungeon, the Hunter-Type starter dungeons each have their
      // own task volume, distinct from Training Regimen's.
      actionCount = workoutsByDungeon[d.id] ?? 0;
    } else if (d.ruleType === "progressive" && d.progressive) {
      let clearedRungs = 0;
      for (const rung of d.progressive.rungs) {
        if ((rungCounts[rung.id] ?? 0) >= rung.target) clearedRungs++;
      }
      tierIdx = clearedRungs - 1;
      actionCount = exposuresByDungeon[d.id] ?? 0;
    }

    for (let i = 0; i <= tierIdx; i++) {
      dungeonTierBonusTotal += TIER_BONUS_XP[i] ?? 0;
    }
    if (tierIdx >= 0 && actionCount > 0) {
      const scale = TIER_PER_ACTION_BONUS[tierIdx] ?? 0;
      dungeonPerActionBonusTotal += actionCount * scale;
    }
  }

  // Perfect-day bonus: +30 XP for every date where all 7 daily quests
  // were completed. Mirrors what DailyQuests.tsx celebrates client-side
  // with notifyStatsUpdated({ xpDelta: PERFECT_DAY_BONUS_XP }), without
  // counting it here the bonus was a phantom that disappeared on the
  // next server refetch (Lv 2 dropping back to Lv 1 after a refresh).
  const perfectDayBonusXp = perfectQuestDays * PERFECT_DAY_BONUS_XP;

  // Cadence full-clear bonus: +20 XP for every cadence-window in which
  // the player completed every required workout type for that dungeon.
  // CadenceDungeonCard.tsx awards this client-side via notifyStatsUpdated
  //, same phantom-XP problem as perfect-day. Count it here so it sticks
  // across refreshes.
  //
  // Window key:
  // - daily-cadence dungeons (cadence.window === "day"), UTC date.
  // - weekly-cadence dungeons, UTC Monday of the event's week.
  // Counted via deduped workout types per window: a window is "full
  // clear" when the set size matches cadence.workouts.length.
  function windowKeyFor(date: Date, window: "day" | "week"): string {
    if (window === "day") return date.toISOString().split("T")[0];
    const day = date.getUTCDay();
    const offsetToMonday = (day + 6) % 7;
    const monday = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - offsetToMonday
      )
    );
    return monday.toISOString().split("T")[0];
  }
  let cadenceFullClearCount = 0;
  let weekCadenceFullClearCount = 0;
  for (const d of DUNGEONS) {
    if (d.ruleType !== "cadence" || !d.cadence) continue;
    const requiredCount = d.cadence.workouts.length;
    if (requiredCount === 0) continue;
    const window = d.cadence.window;
    const byWindow: Record<string, Set<string>> = {};
    for (const e of events) {
      if (e.run.dungeonId !== d.id) continue;
      if (!workoutIds.has(e.type)) continue;
      const key = windowKeyFor(e.date, window);
      if (!byWindow[key]) byWindow[key] = new Set();
      byWindow[key].add(e.type);
    }
    for (const [keyDate, set] of Object.entries(byWindow)) {
      if (set.size < requiredCount) continue;
      cadenceFullClearCount++;
      // Window key is a YYYY-MM-DD string (day-cadence) or the Monday
      // of the week (week-cadence). Comparing the parsed date against
      // weekCutoff catches both shapes, a weekly-cadence Monday
      // before the cutoff means that whole window is in the past.
      if (new Date(keyDate) >= weekCutoff) weekCadenceFullClearCount++;
    }
  }
  const cadenceFullClearBonusXp =
    cadenceFullClearCount * CADENCE_FULL_CLEAR_BONUS_XP;

  // Claimed trophy XP, sum of rarity-mapped values for every
  // achievement the player has tapped Claim on. Unclaimed trophies
  // contribute zero. Persisted via Achievement.claimedAt, so this
  // calc is deterministic across refetches (no phantom-XP risk).
  const achievementById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  const claimedTrophyXp = claimedTrophies.reduce((sum, row) => {
    const def = achievementById.get(row.achievementId);
    if (!def) return sum;
    return sum + (TROPHY_XP_BY_RARITY[def.rarity] ?? 0);
  }, 0);

  const totalXp =
    activeStreakTotal * XP_PER_STREAK_DAY +
    bankedStreakDays * XP_PER_STREAK_DAY +
    checkInXpDays * XP_PER_STREAK_DAY +
    workoutTotal * XP_PER_WORKOUT +
    exposureTotal * XP_PER_EXPOSURE +
    completedRunCount * XP_PER_COMPLETION +
    questXpTotal +
    comboMilestoneXp +
    perfectDayBonusXp +
    cadenceFullClearBonusXp +
    claimedTrophyXp +
    dungeonTierBonusTotal +
    dungeonPerActionBonusTotal;

  const { level } = getLevelFromXp(totalXp);

  // Distinct activity days: union of dates from quests, journal/log
  // events, and cleared check-ins. "The System knows your face" (Daily
  // Witness) means you've shown up at all, not that you did everything;
  // any tracked surface counts.
  const activityDaySet = new Set<string>();
  for (const q of quests) {
    activityDaySet.add(q.date.toISOString().split("T")[0]);
  }
  for (const e of events) {
    activityDaySet.add(e.date.toISOString().split("T")[0]);
  }
  for (const c of checkInDates) {
    activityDaySet.add(c.date.toISOString().split("T")[0]);
  }
  const distinctActivityDays = activityDaySet.size;

  // Phoenix (Shadow): hunter has returned to a dungeon they previously
  // relapsed in. Look for any dungeonId where the user has a "relapse"
  // event AND multiple runs (proving they exited and re-entered later).
  // Derived from existing data, no extra prisma query.
  const relapsedDungeons = new Set<string>();
  for (const e of events) {
    if (e.type === "relapse") {
      relapsedDungeons.add(e.run.dungeonId);
    }
  }
  const runsPerDungeon: Record<string, number> = {};
  for (const r of runs) {
    runsPerDungeon[r.dungeonId] = (runsPerDungeon[r.dungeonId] ?? 0) + 1;
  }
  const phoenixUnlocked = Array.from(relapsedDungeons).some(
    (d) => (runsPerDungeon[d] ?? 0) >= 2
  );

  // Comeback (Shadow): scored a perfect day the morning after a
  // scattered day. Sort quest completions by date, group per day,
  // look for a perfect-day immediately following a gap day.
  // Threshold for "perfect day" mirrors perfectQuestDays logic: all
  // QUESTS completed on the same day. Skipping side quests since
  // those don't count toward "perfect" elsewhere.
  const dailyQuestSet = new Set(QUESTS.map((q) => q.id));
  const questsByDate = new Map<string, Set<string>>();
  for (const q of quests) {
    const day = q.date.toISOString().split("T")[0];
    if (!dailyQuestSet.has(q.questId)) continue;
    const bucket = questsByDate.get(day) ?? new Set<string>();
    bucket.add(q.questId);
    questsByDate.set(day, bucket);
  }
  const sortedDays = Array.from(questsByDate.keys()).sort();
  let comebackUnlocked = false;
  for (let i = 1; i < sortedDays.length; i++) {
    const today = sortedDays[i];
    const yesterday = sortedDays[i - 1];
    const todayIsPerfect =
      (questsByDate.get(today)?.size ?? 0) >= dailyQuestSet.size;
    if (!todayIsPerfect) continue;
    // Gap check: was the day BEFORE today not adjacent to today?
    // "Scattered" means the player missed a day before this one.
    // Compute calendar diff between today and yesterday-in-our-set.
    const dToday = new Date(today + "T00:00:00Z").getTime();
    const dYest = new Date(yesterday + "T00:00:00Z").getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const gap = Math.round((dToday - dYest) / dayMs);
    if (gap > 1) {
      comebackUnlocked = true;
      break;
    }
  }

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
        // Weighted total, leaderboard ranks on this. Pulls weights
        // from ACTIVITY_POINTS so the table is the single source of
        // truth and any rebalance lands in one place.
        activityPoints:
          weekDailyQuests * ACTIVITY_POINTS.dailyQuest +
          weekSideQuests * ACTIVITY_POINTS.sideQuest +
          weekClearedDays * ACTIVITY_POINTS.dayCleared +
          weekWorkout * ACTIVITY_POINTS.workout +
          weekCadenceFullClearCount * ACTIVITY_POINTS.cadenceFullClear +
          weekExposure * ACTIVITY_POINTS.exposure +
          weekPerfect * ACTIVITY_POINTS.perfectDay,
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
    publicReflections,
    friendCount,
    everInGuild: guildMemberCount > 0,
    distinctActivityDays,
    phoenixUnlocked,
    comebackUnlocked,
  };
}

const buildSnapshot = unstable_cache(
  _buildSnapshot,
  ["build-snapshot"],
  { tags: [TAG] }
);

/**
 * Public version for cross-module use (e.g. friends.ts), returns the
 * authoritative level + rank for any user. Other modules MUST use this
 * instead of recomputing XP locally to avoid drift between views.
 */
export interface HunterSummary {
  hunterId: string;
  hunterName: string;
  imageUrl: string | null;
  level: number;
  rank: string;
  /** Activity points earned in the rolling last-7-days window. Drives
   *  the weekly leaderboard ranking. Sourced from
   *  PlayerSnapshot.windows.week.activityPoints. */
  weeklyActivityPoints: number;
}

/**
 * Lean leaderboard / friend-row reader. Returns just the fields a
 * leaderboard row needs, name, avatar, level, rank, weekly activity
 * points. Powers the future weekly leaderboard and is a drop-in
 * replacement for the heavier per-row data the friends list currently
 * builds out of getPlayerLevelForUser + a separate Clerk lookup.
 *
 * For batch use, prefer getHunterSummariesByIds, it issues a single
 * Clerk getUserList for the whole set instead of N round-trips.
 */
export async function getHunterSummariesByIds(
  hunterIds: string[]
): Promise<HunterSummary[]> {
  await requireUserId();
  if (hunterIds.length === 0) return [];

  // Distinguish "batch fetch failed" (return null) from "batch returned
  // but this user isn't in it" (orphan, filter). Without the null
  // sentinel a transient Clerk failure would erase every hunter from
  // the leaderboard / friends list, way worse than leaving in a few
  // orphan placeholders.
  const [snapshots, clerkUsers] = await Promise.all([
    Promise.all(hunterIds.map((id) => buildSnapshot(id))),
    (async () => {
      try {
        const client = await clerkClient();
        // Clerk's getUserList defaults to limit:10 with a max of 500.
        // Without an explicit limit, anyone past the first 10 returns
        // missing, and the orphan-filter below would then drop them
        // as ghosts. That's why Troy disappeared from his own
        // leaderboard once active hunter count crossed 10.
        const list = await client.users.getUserList({
          userId: hunterIds,
          limit: Math.min(hunterIds.length, 500),
        });
        return list.data;
      } catch {
        return null;
      }
    })(),
  ]);

  const batchFailed = clerkUsers === null;
  const clerkById = new Map(
    (clerkUsers ?? []).map((u) => [u.id, u])
  );
  const summaries: HunterSummary[] = [];
  for (let i = 0; i < hunterIds.length; i++) {
    const id = hunterIds[i];
    const snap = snapshots[i];
    const u = clerkById.get(id);
    // If Clerk responded but this id wasn't in the result, the
    // account has been deleted upstream, drop the row instead of
    // showing a "Hunter" / "?" orphan tile in the leaderboard. If
    // the whole batch failed (Clerk down), keep the row with a
    // placeholder so a transient outage doesn't wipe the board.
    if (!u && !batchFailed) continue;
    const display = u
      ? resolveHunterDisplay(u)
      : { hunterName: "Hunter", imageUrl: null };
    summaries.push({
      hunterId: id,
      hunterName: display.hunterName,
      imageUrl: display.imageUrl,
      level: snap.level,
      rank: getRank(snap.level),
      weeklyActivityPoints: snap.windows.week.activityPoints ?? 0,
    });
  }
  return summaries;
}

export async function getHunterSummary(
  hunterId: string
): Promise<HunterSummary | null> {
  const [s] = await getHunterSummariesByIds([hunterId]);
  return s ?? null;
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

  // Revoke achievements whose underlying condition is no longer true
  // (e.g. user undid the exposure log, unticked the only daily quest,
  // exited the dungeon that was their first run). If the row was
  // already claimed, deleting it also removes the trophy XP since
  // claimedTrophyXp in buildSnapshot only sums existing rows.
  //
  // Combo milestones are excluded, they're point-in-time markers for
  // a streak that genuinely happened. Unticking today's quest shouldn't
  // erase a 30-day combo earned weeks ago.
  const definedById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  const toRevoke: string[] = [];
  for (const id of existingIds) {
    if (isComboAchievementId(id)) continue;
    const def = definedById.get(id);
    if (!def) continue;
    if (!def.check(snapshot)) toRevoke.push(id);
  }

  if (toRevoke.length > 0) {
    await prisma.achievement.deleteMany({
      where: { userId, achievementId: { in: toRevoke } },
    });
  }

  if (newlyUnlocked.length > 0) {
    const now = new Date();
    await prisma.achievement.createMany({
      // Combo milestones pay out XP via comboMilestoneXp at unlock
      // time (see totalXp calc above), not via a manual claim. They're
      // also hidden from the trophy grid by design. Auto-claim them
      // here so the navbar's unclaimed-badge can't accumulate orphan
      // entries the player has no way to clear.
      data: newlyUnlocked.map((id) => ({
        userId,
        achievementId: id,
        ...(isComboAchievementId(id) ? { claimedAt: now } : {}),
      })),
      skipDuplicates: true,
    });
  }

  if (newlyUnlocked.length > 0 || toRevoke.length > 0) {
    updateTag(TAG);
  }

  return newlyUnlocked;
}

const getUnlockedAchievementsCached = unstable_cache(
  async (userId: string): Promise<UnlockedAchievement[]> => {
    const rows = await prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.achievementId,
      unlockedAt: r.unlockedAt.toISOString(),
      claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
    }));
  },
  ["unlocked-achievements"],
  { tags: [TAG] }
);

/**
 * Mark an achievement as claimed and award the rarity-based XP. The
 * server XP calc in buildSnapshot reads claimedAt rows and sums the
 * rarity-mapped XP into totalXp, that's the persistence path. This
 * action just flips the row.
 *
 * Idempotent: re-claiming a row that already has claimedAt set
 * touches no rows (the where clause filters claimedAt: null).
 */
export async function claimAchievement(achievementId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.achievement.updateMany({
    where: { userId, achievementId, claimedAt: null },
    data: { claimedAt: new Date() },
  });
  updateTag(TAG);
}

/** Used by the navbar badge, single integer count, dirt cheap. Direct
 *  read - the navbar badge needs to decrement immediately after a
 *  claim, and unstable_cache's per-lambda LRU can lag a claim by
 *  multiple seconds (same root cause as the profile-claim bug). */
export async function getUnclaimedTrophyCount(): Promise<number> {
  const userId = await requireUserId();
  // Combo milestones are toast-only moments, never surfaced in the
  // trophy grid. Excluding them here matches the grid filter so the
  // badge can't show a count for a trophy the player can't find or
  // claim. Also backfills the previous bug where combo rows landed
  // unclaimed and got counted.
  return prisma.achievement.count({
    where: {
      userId,
      claimedAt: null,
      NOT: { achievementId: { startsWith: "combo-" } },
    },
  });
}

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

  const [quests, events, checkIns] = await Promise.all([
    prisma.questCompletion.findMany({
      where: { userId, date: { gte: cutoff } },
      select: { date: true },
    }),
    prisma.dungeonEvent.findMany({
      where: { run: { userId }, date: { gte: cutoff } },
      select: { date: true },
    }),
    // Cleared day check-ins from streak / timed / training-program
    // dungeons. Without this, a player whose activity is calendar-
    // taps (NoFap, Doomscroll, etc.) has a permanently empty heatmap.
    prisma.dungeonDayCheckIn.findMany({
      where: { userId, state: "cleared", date: { gte: cutoff } },
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
  for (const c of checkIns) {
    const key = c.date.toISOString().split("T")[0];
    bucket[key] = (bucket[key] ?? 0) + 1;
  }
  return bucket;
}

// Direct read, NOT unstable_cache. Same reasoning as
// getTodayCompletions in quests.ts: unstable_cache's tag invalidation
// is per-Node-process, and Vercel runs multiple warm lambdas. When
// claimAchievement runs on lambda A and calls updateTag, only A's
// LRU is invalidated. The next request can land on lambda B which
// still holds the pre-claim snapshot+rows, the profile reload then
// reads claimedAt: null and the UI snaps back to unclaimed. Bug
// reported on phone: "It took 2+ seconds for the claim trophy to be
// safely saved or else if i go make other actions ... it goes back
// to unclaimed which is shit."
// _buildSnapshot is the heaviest piece (a handful of indexed
// per-user prisma reads), ~50-200ms warm. Acceptable: the profile
// page already loads infrequently and the localStorage cache covers
// the perceived latency.
export async function getProfilePageData(): Promise<ProfilePageData> {
  const userId = await requireUserId();
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
      claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
    })),
    heatmap,
  };
}

export interface PublicDungeonRunSummary {
  dungeonId: string;
  startDate: string | null;
  active: boolean;
  /** Pre-computed ruleType-aware display, e.g. "12d cleared",
   *  "3/5 this week", "Acknowledge 4/7", "1/4 sweets". */
  displayValue: string;
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
    const target = d.cadence?.target ?? 5;
    const isDaily = d.cadence?.window === "day";
    const periodStart = isDaily
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      : startOfUtcWeekMonday(now);
    const periodEnd = new Date(
      periodStart.getTime() + (isDaily ? 1 : 7) * 24 * 60 * 60 * 1000
    );
    const count = await prisma.dungeonEvent.count({
      where: {
        runId: run.id,
        date: { gte: periodStart, lt: periodEnd },
      },
    });
    return `${count}/${target} ${isDaily ? "today" : "this week"}`;
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
  hunterType: string | null;
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

  const meta = user.unsafeMetadata as
    | { hunterName?: string; hunterType?: unknown }
    | undefined;
  const hunterName =
    meta?.hunterName ||
    user.firstName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Hunter";
  const hunterType =
    typeof meta?.hunterType === "string" ? meta.hunterType : null;

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
      claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
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
    hunterType,
  };
}