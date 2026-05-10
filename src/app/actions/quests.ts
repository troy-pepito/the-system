"use server";

import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { QUESTS, applyQuest, ZERO_REWARDS, type QuestRewards } from "@/lib/quests";
import { requireUserId } from "@/lib/auth";

const TAG = "player:stats";

// Direct read, NOT unstable_cache. unstable_cache's tag invalidation is
// per-Node-process; on Vercel each lambda has its own LRU, so updateTag
// after a toggle only invalidates the lambda that ran the toggle. The
// next request can land on a different warm lambda and serve stale
// state, which is what caused the "tick disappears after navigating
// back" regression. The query is tiny (indexed lookup of one user's
// completions for one day), so skipping the cache costs ~5ms and buys
// guaranteed read-your-own-writes.
export async function getTodayCompletions(dateIso: string): Promise<string[]> {
  const userId = await requireUserId();
  const rows = await prisma.questCompletion.findMany({
    where: { userId, date: new Date(dateIso) },
    select: { questId: true },
  });
  return rows.map((r) => r.questId);
}

export async function toggleQuestCompletion(
  questId: string,
  dateIso: string
): Promise<{ completed: boolean }> {
  const userId = await requireUserId();
  const date = new Date(dateIso);
  const existing = await prisma.questCompletion.findUnique({
    where: { userId_questId_date: { userId, questId, date } },
  });
  if (existing) {
    await prisma.questCompletion.delete({ where: { id: existing.id } });
    updateTag(TAG);
    return { completed: false };
  }
  await prisma.questCompletion.create({ data: { userId, questId, date } });
  updateTag(TAG);
  return { completed: true };
}

const getLifetimeRewardsCached = unstable_cache(
  async (userId: string) => {
    const rows = await prisma.questCompletion.findMany({
      where: { userId },
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
  const userId = await requireUserId();
  return getLifetimeRewardsCached(userId);
}