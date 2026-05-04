import {
  getTodayCompletions,
  toggleQuestCompletion,
} from "@/app/actions/quests";
import {
  confirmDay,
  endRun,
  replayEnterDungeon,
  logJournalEntry,
  logRungExposure,
  setRunStartDate,
  toggleWorkout,
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
  if (stillActive) await endRun(m.dungeonId, m.reason, m.note, m.isPublic);
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
    case "dungeon:logExposure":
      await logRungExposure(m.dungeonId, m.rungId, m.note, m.isPublic);
      return;
    case "dungeon:undoExposure":
      await undoRungExposure(m.dungeonId, m.rungId);
      return;
    case "dungeon:journalLog":
      await logJournalEntry(m.dungeonId, m.note, m.isPublic);
      return;
    case "dungeon:enter": {
      const enqueuedAt = parseEnqueuedAt(m.id) ?? Date.now();
      await replayEnterDungeon(m.dungeonId, enqueuedAt);
      return;
    }
    case "dungeon:setStartDate":
      await setRunStartDate(m.dungeonId, m.dateIso);
      return;
    case "dungeon:confirmDay":
      await confirmDay(m.dungeonId, m.dateIso, m.state, m.note, m.isPublic);
      return;
    case "clerk:updateHunterName":
    case "clerk:updateAvatar":
      throw new Error("clerk mutations are handled outside drainQueue");
  }
}

function isDrainable(m: Mutation): boolean {
  return !m.type.startsWith("clerk:");
}

// Mutations older than this are dropped on drain instead of being
// applied. The mutation id is `${Date.now()}-${random}`, so the part
// before the dash is the enqueue timestamp in millis. A genuinely
// offline user is back online within hours; anything older than a
// week is almost certainly leftover state from a flaky network or a
// device that was put away for a while — replaying it can resurrect
// dungeon runs the user has since ended (Sound Sensitization
// auto-reappearing) or clobber check-in state (relapses overwritten
// with cleared). Better to drop it than to silently corrupt data.
const MUTATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function parseEnqueuedAt(id: string): number | null {
  const dash = id.indexOf("-");
  if (dash <= 0) return null;
  const ts = parseInt(id.slice(0, dash), 10);
  return Number.isFinite(ts) ? ts : null;
}

function isStale(m: Mutation): boolean {
  const enqueuedAt = parseEnqueuedAt(m.id);
  if (enqueuedAt === null) return false;
  return Date.now() - enqueuedAt > MUTATION_TTL_MS;
}

export async function drainQueue(): Promise<void> {
  if (drainInFlight) return drainInFlight;
  drainInFlight = (async () => {
    try {
      while (true) {
        const queue = getQueue();
        const next = queue.find(isDrainable);
        if (!next) return;
        if (isStale(next)) {
          removeMutations([next.id]);
          continue;
        }
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