"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  getHunterSummariesByIds,
  type HunterSummary,
} from "@/app/actions/achievements";

const TAG = "player:stats";

export type LeaderboardScope = "global" | "friends" | "guild";

export interface LeaderboardRow extends HunterSummary {
  /** 1-indexed position within the returned list. Named `position`
   *  rather than `rank` because HunterSummary already has a `rank`
   *  (the E/D/C/B/A/S level rank). */
  position: number;
  /** True when the viewer is the hunter on this row — drives the
   *  "your rank" highlight in the UI. */
  isViewer: boolean;
}

export interface LeaderboardResult {
  scope: LeaderboardScope;
  rows: LeaderboardRow[];
  /** Viewer's row even when it's outside the top-N — null when the
   *  viewer doesn't qualify (e.g. friends scope with no friends). */
  viewerRow: LeaderboardRow | null;
}

/** Source-of-truth for who shows up on the global board: anyone who
 *  has touched any tracked surface. Pulling from DB instead of Clerk's
 *  user list keeps it cheap and limits visibility to active hunters. */
const _globalHunterIds = unstable_cache(
  async (): Promise<string[]> => {
    const [runs, quests, checkIns] = await Promise.all([
      prisma.dungeonRun.findMany({
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.questCompletion.findMany({
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.dungeonDayCheckIn.findMany({
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);
    const set = new Set<string>();
    for (const r of runs) set.add(r.userId);
    for (const q of quests) set.add(q.userId);
    for (const c of checkIns) set.add(c.userId);
    return Array.from(set);
  },
  ["global-hunter-ids"],
  { tags: [TAG] }
);

/** Friend ids in the "accepted" status — input to the friends-scope
 *  leaderboard. Includes the viewer themselves (added at the call site
 *  so the cache can be shared across viewers). */
async function getAcceptedFriendIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: viewerId, status: "accepted" },
        { addresseeId: viewerId, status: "accepted" },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) =>
    r.requesterId === viewerId ? r.addresseeId : r.requesterId
  );
}

/** Guild member ids for the viewer's accepted membership — input to
 *  the guild-scope leaderboard. Empty array when the viewer isn't in
 *  a guild yet. */
async function getMyGuildMemberIds(viewerId: string): Promise<string[]> {
  const member = await prisma.guildMember.findFirst({
    where: { userId: viewerId, status: "accepted" },
    select: { guildId: true },
  });
  if (!member) return [];
  const rows = await prisma.guildMember.findMany({
    where: { guildId: member.guildId, status: "accepted" },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

const TOP_N = 50;

export async function getLeaderboard(
  scope: LeaderboardScope = "global"
): Promise<LeaderboardResult> {
  const viewerId = await requireUserId();

  let candidateIds: string[];
  if (scope === "friends") {
    const friends = await getAcceptedFriendIds(viewerId);
    // Always include the viewer in their own friends-board so they
    // see where they stand; else a brand-new account with one friend
    // would show a list of one with no self-context.
    candidateIds = Array.from(new Set([viewerId, ...friends]));
  } else if (scope === "guild") {
    candidateIds = await getMyGuildMemberIds(viewerId);
  } else {
    candidateIds = await _globalHunterIds();
  }

  if (candidateIds.length === 0) {
    return { scope, rows: [], viewerRow: null };
  }

  const summaries = await getHunterSummariesByIds(candidateIds);
  // Stable secondary sort by hunterId so ties don't shuffle between
  // requests (matters when viewer's "your rank" line has to match
  // their position in the rendered list).
  const sorted = [...summaries].sort((a, b) => {
    if (b.weeklyActivityPoints !== a.weeklyActivityPoints) {
      return b.weeklyActivityPoints - a.weeklyActivityPoints;
    }
    return a.hunterId.localeCompare(b.hunterId);
  });

  const rows: LeaderboardRow[] = sorted.map((s, i) => ({
    ...s,
    position: i + 1,
    isViewer: s.hunterId === viewerId,
  }));
  const top = rows.slice(0, TOP_N);
  const viewerInTop = top.find((r) => r.isViewer);
  const viewerRow = viewerInTop ?? rows.find((r) => r.isViewer) ?? null;

  return { scope, rows: top, viewerRow };
}
