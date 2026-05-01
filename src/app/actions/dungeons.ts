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
  highestMilestoneIdx,
  comboBonusPerQuest,
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
  /** Per-daily-quest XP bonus from the player's highest combo milestone. */
  questBonus: number;
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
      questBonus: comboBonusPerQuest(highestMilestoneIdx(runs)),
    };
  },
  ["combo-state"],
  { tags: [TAG] }
);

async function getComboState(todayIso: string): Promise<{
  priorComboDays: number;
  milestoneXp: number;
  scattered: boolean;
  questBonus: number;
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
    questBonus: comboState.questBonus,
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
  reason: "relapse" | "completed" | "exited",
  note?: string,
  isPublic = false
): Promise<void> {
  const userId = await requireUserId();
  const trimmedNote = note?.trim();
  if (trimmedNote) {
    const run = await prisma.dungeonRun.findFirst({
      where: { userId, dungeonId, active: true },
    });
    if (run) {
      await prisma.dungeonEvent.create({
        data: {
          runId: run.id,
          type: reason,
          date: new Date(),
          note: trimmedNote,
          isPublic,
        },
      });
    }
  }
  await prisma.dungeonRun.updateMany({
    where: { userId, dungeonId, active: true },
    data: { active: false, endReason: reason },
  });
  updateTag(TAG);
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

function currentDayBounds(): { start: Date; end: Date } {
  const start = todayDateOnly();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Picks the right time range for a cadence dungeon based on its window
 * config. Daily-cadence dungeons (the new starter routines) reset at
 * UTC midnight; weekly-cadence dungeons (Training Regimen) reset on
 * Mondays. Falls back to weekly when the dungeon isn't found so legacy
 * callers don't break.
 */
function cadenceBoundsFor(dungeonId: string): { start: Date; end: Date } {
  const def = getDungeon(dungeonId);
  if (def?.cadence?.window === "day") return currentDayBounds();
  return currentWeekBounds();
}

const getWeekWorkoutsCached = unstable_cache(
  async (userId: string, dungeonId: string) => {
    // Cross-run scope: re-entering mid-window shouldn't blank out tasks
    // you already did. Match the same dedup the snapshot uses so XP and
    // the UI agree.
    const { start, end } = cadenceBoundsFor(dungeonId);
    const events = await prisma.dungeonEvent.findMany({
      where: {
        run: { userId, dungeonId },
        date: { gte: start, lt: end },
      },
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

  const { start, end } = cadenceBoundsFor(dungeonId);
  // Look across all of the user's runs of this dungeon, not just the
  // active one. Otherwise: log a workout → exit → re-enter → toggle
  // shows the workout as undone (different runId), creating a duplicate
  // event in the new run for the same week.
  const existing = await prisma.dungeonEvent.findFirst({
    where: {
      run: { userId, dungeonId },
      type: workoutType,
      date: { gte: start, lt: end },
    },
  });

  if (existing) {
    await prisma.dungeonEvent.deleteMany({
      where: {
        run: { userId, dungeonId },
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

export interface JournalEntry {
  id: number;
  dungeonId: string;
  type: string;
  date: string;
  note: string;
  isPublic: boolean;
  createdAt: string;
}

const getJournalEntriesCached = unstable_cache(
  async (userId: string) => {
    const events = await prisma.dungeonEvent.findMany({
      where: { note: { not: null }, run: { userId } },
      include: { run: { select: { dungeonId: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return events.map((e) => ({
      id: e.id,
      dungeonId: e.run.dungeonId,
      type: e.type,
      date: e.date.toISOString().split("T")[0],
      note: e.note ?? "",
      isPublic: e.isPublic,
      createdAt: e.createdAt.toISOString(),
    }));
  },
  ["journal-entries"],
  { tags: [TAG] }
);

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const userId = await requireUserId();
  return getJournalEntriesCached(userId);
}

const getRungCountsCached = unstable_cache(
  async (userId: string, dungeonId: string) => {
    // Cross-run scope so re-entering Exposure Therapy preserves the
    // ladder progress. The UI reads this to find currentRungIndex; if
    // we scoped to active run only, every re-entry would offer Rung 1
    // (count=0) again — closes the same exit/re-enter exploit pattern
    // we fixed for the calendar dungeons.
    const events = await prisma.dungeonEvent.groupBy({
      by: ["type"],
      where: { run: { userId, dungeonId } },
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
  rungId: string,
  note?: string,
  isPublic = false
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

  const trimmedNote = note?.trim();
  await prisma.dungeonEvent.create({
    data: {
      runId: run.id,
      type: rungId,
      date: new Date(),
      value: 1,
      ...(trimmedNote ? { note: trimmedNote, isPublic } : {}),
    },
  });

  // Count across all of the user's runs for this dungeon — matches what
  // getRungCounts returns to the client, so the UI's optimistic count
  // and the server's confirmation stay in sync after exit/re-enter.
  const count = await prisma.dungeonEvent.count({
    where: { run: { userId, dungeonId }, type: rungId },
  });
  const rungCleared = count >= rung.target;

  let dungeonCleared = false;
  if (rungCleared) {
    const allCounts = await prisma.dungeonEvent.groupBy({
      by: ["type"],
      where: { run: { userId, dungeonId } },
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

  // Delete the most recent event for this rung across all the user's
  // runs of this dungeon. If we scoped to active run only, undo on a
  // freshly re-entered run wouldn't be able to walk back exposures
  // logged in a prior run, leaving the cross-run count stuck.
  const last = await prisma.dungeonEvent.findFirst({
    where: { run: { userId, dungeonId }, type: rungId },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    await prisma.dungeonEvent.delete({ where: { id: last.id } });
  }
  const count = await prisma.dungeonEvent.count({
    where: { run: { userId, dungeonId }, type: rungId },
  });
  updateTag(TAG);
  return { count };
}

export interface DayCheckIn {
  date: string;
  state: "cleared" | "relapsed";
  count: number;
}

const getCheckInsCached = unstable_cache(
  async (userId: string, dungeonId: string) => {
    // Scoped by (userId, dungeonId) — the schema unique on
    // (userId, dungeonId, date) means one row per calendar day, so the
    // calendar shows the user's full history regardless of which run
    // confirmed the day.
    const checkIns = await prisma.dungeonDayCheckIn.findMany({
      where: { userId, dungeonId },
      orderBy: { date: "asc" },
      select: { date: true, state: true, count: true },
    });
    return checkIns.map((c) => ({
      date: c.date.toISOString().split("T")[0],
      state: c.state as "cleared" | "relapsed",
      count: c.count,
    }));
  },
  ["dungeon-checkins"],
  { tags: [TAG] }
);

export async function getCheckIns(dungeonId: string): Promise<DayCheckIn[]> {
  const userId = await requireUserId();
  return getCheckInsCached(userId, dungeonId);
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export async function clearCheckIn(
  dungeonId: string,
  dateIso: string
): Promise<void> {
  const userId = await requireUserId();
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  await prisma.dungeonDayCheckIn.deleteMany({
    where: { userId, dungeonId, date },
  });
  updateTag(TAG);
}

async function findActiveStreakRun(userId: string, dungeonId: string) {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) throw new Error(`Unknown dungeon ${dungeonId}`);
  if (
    dungeon.ruleType !== "continuous_streak" &&
    dungeon.ruleType !== "timed"
  ) {
    throw new Error(`Dungeon ${dungeonId} doesn't support day check-ins`);
  }
  const run = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!run) throw new Error(`No active run for ${dungeonId}`);
  return run;
}

function validateCheckInDate(
  dateIso: string,
  startDate: Date | null
): Date {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  const today = todayDateOnly();
  // Clients send "today" in their local timezone. Users east of UTC
  // (e.g. UAE +4, PHT +8) cross midnight before UTC does, so their
  // "today" can legitimately be UTC tomorrow. Allow up to +1 day
  // from UTC today — covers every timezone from UTC-12 to UTC+14
  // while still rejecting actual-future dates.
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  if (date.getTime() > tomorrow.getTime()) {
    throw new Error("Cannot confirm a future date");
  }
  if (startDate && date.getTime() < startDate.getTime()) {
    throw new Error("Date is before the run started");
  }
  return date;
}

export async function confirmDay(
  dungeonId: string,
  dateIso: string,
  state: "cleared" | "relapsed",
  note?: string,
  isPublic = false
): Promise<void> {
  const userId = await requireUserId();
  const run = await findActiveStreakRun(userId, dungeonId);
  const date = validateCheckInDate(dateIso, run.startDate);

  if (state === "relapsed") {
    const trimmedNote = note?.trim();
    const existing = await prisma.dungeonDayCheckIn.findUnique({
      where: { userId_dungeonId_date: { userId, dungeonId, date } },
    });
    const nextCount =
      existing && existing.state === "relapsed" ? existing.count + 1 : 1;
    await prisma.dungeonDayCheckIn.upsert({
      where: { userId_dungeonId_date: { userId, dungeonId, date } },
      create: {
        runId: run.id,
        userId,
        dungeonId,
        date,
        state: "relapsed",
        count: nextCount,
      },
      update: {
        runId: run.id,
        state: "relapsed",
        count: nextCount,
        confirmedAt: new Date(),
      },
    });
    if (trimmedNote) {
      await prisma.dungeonEvent.create({
        data: {
          runId: run.id,
          type: "relapse",
          date,
          note: trimmedNote,
          isPublic,
        },
      });
    }
  } else {
    await prisma.dungeonDayCheckIn.upsert({
      where: { userId_dungeonId_date: { userId, dungeonId, date } },
      create: {
        runId: run.id,
        userId,
        dungeonId,
        date,
        state: "cleared",
        count: 1,
      },
      update: {
        runId: run.id,
        state: "cleared",
        count: 1,
        confirmedAt: new Date(),
      },
    });
  }

  updateTag(TAG);
}

export async function logJournalEntry(
  dungeonId: string,
  note: string,
  isPublic = false
): Promise<void> {
  const userId = await requireUserId();
  const trimmed = note.trim();
  if (!trimmed) return;
  const run = await prisma.dungeonRun.findFirst({
    where: { userId, dungeonId, active: true },
  });
  if (!run) throw new Error(`No active run for ${dungeonId}`);

  await prisma.dungeonEvent.create({
    data: {
      runId: run.id,
      type: "journal",
      date: new Date(),
      note: trimmed,
      isPublic,
    },
  });
  updateTag(TAG);
}

/**
 * Updates a journal-style entry's note text and isPublic flag. The
 * caller must own the underlying run; otherwise the update is a no-op.
 */
export async function updateJournalEntry(
  eventId: number,
  note: string,
  isPublic: boolean
): Promise<void> {
  const userId = await requireUserId();
  const trimmed = note.trim();
  if (!trimmed) return;
  // Update only when the event belongs to a run owned by the caller.
  await prisma.dungeonEvent.updateMany({
    where: { id: eventId, run: { userId } },
    data: { note: trimmed, isPublic },
  });
  updateTag(TAG);
}

/**
 * Deletes a journal-style entry. Caller must own the underlying run.
 */
export async function deleteJournalEntry(eventId: number): Promise<void> {
  const userId = await requireUserId();
  await prisma.dungeonEvent.deleteMany({
    where: { id: eventId, run: { userId } },
  });
  updateTag(TAG);
}