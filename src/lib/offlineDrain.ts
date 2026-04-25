import {
  getTodayCompletions,
  toggleQuestCompletion,
} from "@/app/actions/quests";
import {
  endRun,
  enterDungeon,
  logAllowanceEvent,
  logJournalEntry,
  logRungExposure,
  setRunStartDate,
  toggleWorkout,
  undoAllowanceEvent,
  undoRungExposure,
  getAllActiveRuns,
  getWeekWorkouts,
} from "@/app/actions/dungeons";
import {
  getQueue,
  removeMutations,
  type Mutation,
} from "@/lib/offlineQueue";

let drainInFlight: Promise<void> | null = null;

async function applyQuestToggle(
  m: Extract<Mutation, { type: "quest:toggle" }>
): Promise<void> {
  const serverCompleted = new Set(await getTodayCompletions(m.date));
  const isCompleted = serverCompleted.has(m.questId);
  if (isCompleted !== m.desiredCompleted) {
    await toggleQuestCompletion(m.questId, m.date);
  }
}

async function applyDungeonEndRun(
  m: Extract<Mutation, { type: "dungeon:endRun" }>
): Promise<void> {
  const active = await getAllActiveRuns();
  const stillActive = active.some((r) => r.dungeonId === m.dungeonId);
  if (stillActive) await endRun(m.dungeonId, m.reason, m.note);
}

async function applyDungeonWorkoutToggle(
  m: Extract<Mutation, { type: "dungeon:workoutToggle" }>
): Promise<void> {
  const week = new Set(await getWeekWorkouts(m.dungeonId));
  const isCompleted = week.has(m.workoutId);
  if (isCompleted !== m.desiredCompleted) {
    await toggleWorkout(m.dungeonId, m.workoutId);
  }
}

async function applyMutation(m: Mutation): Promise<void> {
  switch (m.type) {
    case "quest:toggle":
      return applyQuestToggle(m);
    case "dungeon:endRun":
      return applyDungeonEndRun(m);
    case "dungeon:workoutToggle":
      return applyDungeonWorkoutToggle(m);
    case "dungeon:logAllowance":
      await logAllowanceEvent(m.dungeonId, m.eventType, m.note);
      return;
    case "dungeon:undoAllowance":
      await undoAllowanceEvent(m.dungeonId, m.eventType);
      return;
    case "dungeon:logExposure":
      await logRungExposure(m.dungeonId, m.rungId, m.note);
      return;
    case "dungeon:undoExposure":
      await undoRungExposure(m.dungeonId, m.rungId);
      return;
    case "dungeon:journalLog":
      await logJournalEntry(m.dungeonId, m.note);
      return;
    case "dungeon:enter":
      await enterDungeon(m.dungeonId);
      return;
    case "dungeon:setStartDate":
      await setRunStartDate(m.dungeonId, m.dateIso);
      return;
    case "clerk:updateHunterName":
    case "clerk:updateAvatar":
      throw new Error("clerk mutations are handled outside drainQueue");
  }
}

function isDrainable(m: Mutation): boolean {
  return !m.type.startsWith("clerk:");
}

export async function drainQueue(): Promise<void> {
  if (drainInFlight) return drainInFlight;
  drainInFlight = (async () => {
    try {
      while (true) {
        const queue = getQueue();
        const next = queue.find(isDrainable);
        if (!next) return;
        try {
          await applyMutation(next);
          removeMutations([next.id]);
        } catch {
          return;
        }
      }
    } finally {
      drainInFlight = null;
    }
  })();
  return drainInFlight;
}