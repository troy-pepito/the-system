"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  getHunterSummariesByIds,
  type HunterSummary,
} from "@/app/actions/achievements";
import { GLOBAL_HUNTERS_TAG } from "@/lib/cacheTags";

export type LeaderboardScope = "global" | "friends" | "guild" | "guilds";

export interface LeaderboardRow extends HunterSummary {
  /** 1-indexed position within the returned list. Named `position`
   *  rather than `rank` because HunterSummary already has a `rank`
   *  (the E/D/C/B/A/S level rank). */
  position: number;
  /** True when the viewer is the hunter on this row, drives the
   *  "your rank" highlight in the UI. */
  isViewer: boolean;
}

/** Cross-guild ranking row, different shape from the hunter rows
 *  because we're ranking guilds against each other, not individuals. */
export interface GuildLeaderboardRow {
  position: number;
  slug: string;
  name: string;
  memberCount: number;
  totalActivityPoints: number;
  /** Per-member average. Surfaces small-but-active guilds that would
   *  otherwise be drowned out by larger ones. */
  avgActivityPoints: number;
  /** True when the viewer is in this guild. */
  isViewerGuild: boolean;
}

export type LeaderboardResult =
  | {
      scope: "global" | "friends" | "guild";
      kind: "hunters";
      rows: LeaderboardRow[];
      viewerRow: LeaderboardRow | null;
    }
  | {
      scope: "guilds";
      kind: "guilds";
      rows: GuildLeaderboardRow[];
      viewerRow: GuildLeaderboardRow | null;
    };

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
  // Own tag, NOT the per-user player:stats — this list only changes
  // when a brand-new user takes their first action. Busting it on every
  // mutation (as the pre-refactor global TAG did) flushed every cached
  // entry uselessly. With no explicit revalidate, new users surface
  // within Next's default cache TTL.
  { tags: [GLOBAL_HUNTERS_TAG] }
);

/** Friend ids in the "accepted" status, input to the friends-scope
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

/** Guild member ids for the viewer's accepted membership, input to
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

  if (scope === "guilds") {
    return getGuildsLeaderboard(viewerId);
  }

  let candidateIds: string[];
  if (scope === "friends") {
    const friends = await getAcceptedFriendIds(viewerId);
    candidateIds = Array.from(new Set([viewerId, ...friends]));
  } else if (scope === "guild") {
    candidateIds = await getMyGuildMemberIds(viewerId);
  } else {
    candidateIds = await _globalHunterIds();
  }

  if (candidateIds.length === 0) {
    return { scope, kind: "hunters", rows: [], viewerRow: null };
  }

  const summaries = await getHunterSummariesByIds(candidateIds);
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

  return { scope, kind: "hunters", rows: top, viewerRow };
}

/**
 * Cross-guild ranking. Sums each guild's accepted-member weekly points,
 * then sorts guilds by total. The viewer's guild always shows even if
 * it's outside the top-N, so a small guild's owner can still see where
 * they stand.
 *
 * Heavy: runs buildSnapshot per member of every guild on the board.
 * unstable_cache on buildSnapshot keeps repeat loads cheap, but cold
 * cache after a TAG bump will hit the DB once per member. Acceptable
 * at private-beta scale; revisit when guilds × members crosses ~500.
 */
async function getGuildsLeaderboard(
  viewerId: string
): Promise<LeaderboardResult> {
  const guilds = await prisma.guild.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      members: {
        where: { status: "accepted" },
        select: { userId: true },
      },
    },
    take: 200,
  });
  if (guilds.length === 0) {
    return { scope: "guilds", kind: "guilds", rows: [], viewerRow: null };
  }

  // Resolve all member ids across all guilds in one batched call so
  // each user's snapshot is computed at most once even if they're in
  // multiple guilds (today only one per user, but the dedupe is cheap).
  const allMemberIds = Array.from(
    new Set(guilds.flatMap((g) => g.members.map((m) => m.userId)))
  );
  const summaries = await getHunterSummariesByIds(allMemberIds);
  const pointsByUser = new Map(
    summaries.map((s) => [s.hunterId, s.weeklyActivityPoints])
  );
  // Only count members whose Clerk record still exists. Orphans
  // (Clerk-deleted accounts whose GuildMember row hasn't been cleaned
  // up yet) shouldn't inflate memberCount or drag the average down,
  // they can't contribute points either way.
  const validMemberIds = new Set(summaries.map((s) => s.hunterId));

  const aggregated = guilds
    .map((g) => {
      const liveMembers = g.members.filter((m) =>
        validMemberIds.has(m.userId)
      );
      const memberCount = liveMembers.length;
      const totalActivityPoints = liveMembers.reduce(
        (sum, m) => sum + (pointsByUser.get(m.userId) ?? 0),
        0
      );
      const avgActivityPoints =
        memberCount > 0
          ? Math.round(totalActivityPoints / memberCount)
          : 0;
      const isViewerGuild = liveMembers.some((m) => m.userId === viewerId);
      return {
        slug: g.slug,
        name: g.name,
        memberCount,
        totalActivityPoints,
        avgActivityPoints,
        isViewerGuild,
      };
    })
    .sort((a, b) => {
      if (b.totalActivityPoints !== a.totalActivityPoints) {
        return b.totalActivityPoints - a.totalActivityPoints;
      }
      // Tie-break by avg, then by name, keeps order stable across
      // requests so the viewer's row position doesn't shuffle.
      if (b.avgActivityPoints !== a.avgActivityPoints) {
        return b.avgActivityPoints - a.avgActivityPoints;
      }
      return a.name.localeCompare(b.name);
    });

  const rows: GuildLeaderboardRow[] = aggregated.map((g, i) => ({
    ...g,
    position: i + 1,
  }));
  const top = rows.slice(0, TOP_N);
  const viewerInTop = top.find((r) => r.isViewerGuild);
  const viewerRow = viewerInTop ?? rows.find((r) => r.isViewerGuild) ?? null;

  return { scope: "guilds", kind: "guilds", rows: top, viewerRow };
}
