import {
  getTodayCompletions,
  toggleQuestCompletion,
} from "@/app/actions/quests";
import {
  getQueue,
  removeMutations,
  type QuestToggleMutation,
} from "@/lib/offlineQueue";

let drainInFlight: Promise<void> | null = null;

async function drainQuestToggles(
  mutations: QuestToggleMutation[]
): Promise<void> {
  const latest = new Map<string, QuestToggleMutation>();
  for (const m of mutations) {
    latest.set(`${m.questId}:${m.date}`, m);
  }

  const byDate = new Map<string, QuestToggleMutation[]>();
  for (const m of latest.values()) {
    const arr = byDate.get(m.date) ?? [];
    arr.push(m);
    byDate.set(m.date, arr);
  }

  const toRemove: string[] = [];

  for (const [date, entries] of byDate) {
    let serverCompleted: Set<string>;
    try {
      serverCompleted = new Set(await getTodayCompletions(date));
    } catch {
      return;
    }

    for (const m of entries) {
      const isCompleted = serverCompleted.has(m.questId);
      if (isCompleted !== m.desiredCompleted) {
        try {
          await toggleQuestCompletion(m.questId, m.date);
        } catch {
          return;
        }
      }
      const duplicates = getQueue().filter(
        (q) =>
          q.type === "quest:toggle" &&
          q.questId === m.questId &&
          q.date === m.date
      );
      for (const d of duplicates) toRemove.push(d.id);
    }
  }

  if (toRemove.length > 0) removeMutations(toRemove);
}

export async function drainQueue(): Promise<void> {
  if (drainInFlight) return drainInFlight;
  drainInFlight = (async () => {
    try {
      const queue = getQueue();
      if (queue.length === 0) return;

      const questToggles = queue.filter(
        (m): m is QuestToggleMutation => m.type === "quest:toggle"
      );
      if (questToggles.length > 0) await drainQuestToggles(questToggles);
    } finally {
      drainInFlight = null;
    }
  })();
  return drainInFlight;
}