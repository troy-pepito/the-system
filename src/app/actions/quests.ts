"use server";

import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { QUESTS, applyQuest, ZERO_REWARDS, type QuestRewards } from "@/lib/quests";

const TAG = "player:stats";

const getTodayCompletionsCached = unstable_cache(
  async (dateIso: string) => {
    const rows = await prisma.questCompletion.findMany({
      where: { date: new Date(dateIso) },
      select: { questId: true },
    });
    return rows.map((r) => r.questId);
  },
  ["today-completions"],
  { tags: [TAG] }
);

export async function getTodayCompletions(dateIso: string): Promise<string[]> {
  return getTodayCompletionsCached(dateIso);
}

export async function toggleQuestCompletion(
  questId: string,
  dateIso: string
): Promise<{ completed: boolean }> {
  const date = new Date(dateIso);
  const existing = await prisma.questCompletion.findUnique({
    where: { questId_date: { questId, date } },
  });
  if (existing) {
    await prisma.questCompletion.delete({ where: { id: existing.id } });
    updateTag(TAG);
    return { completed: false };
  }
  await prisma.questCompletion.create({ data: { questId, date } });
  updateTag(TAG);
  return { completed: true };
}

const getLifetimeRewardsCached = unstable_cache(
  async () => {
    const rows = await prisma.questCompletion.findMany({
      select: { questId: true },
    });
    let total = ZERO_REWARDS;
    for (const row of rows) {
      const q = QUESTS.find((x) => x.id === row.questId);
      if (q) total = applyQuest(total, q, 1);
    }
    return total;
  },
  ["lifetime-rewards"],
  { tags: [TAG] }
);

export async function getLifetimeRewards(): Promise<QuestRewards> {
  return getLifetimeRewardsCached();
}