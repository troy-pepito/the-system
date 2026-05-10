"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  REACTION_EMOJI_SET,
  type ReactionSummary,
} from "@/lib/reactions";
import { resolveHunterDisplay } from "@/lib/hunterDisplay";
import {
  type FeedEntry,
  type RawFeedEvent,
} from "@/lib/feed";
import legacyAuthors from "@/data/legacy-authors.json";

// Snapshot of dev-instance Clerk users captured at the prod cutover
// (2026-05-07). Their userIds still live on DungeonRun rows from the
// pre-migration era, so the feed needs a name + avatar fallback when
// prod Clerk doesn't recognize them. Built from
// scripts/snapshot-legacy-authors.mjs (now deleted).
const LEGACY_AUTHOR_MAP = new Map(
  (legacyAuthors as Array<{
    id: string;
    hunterName: string;
    imageUrl: string | null;
  }>).map((u) => [u.id, u])
);

/**
 * Shared post-fetch assembly: takes a slice of dungeon events and
 * returns the FeedEntry shape the UI consumes. Used by both the
 * public feed (global) and the guild-scoped feed, the WHERE clause
 * differs but everything after (Clerk batch lookup, reactions
 * aggregation, entry mapping, legacy-author fallback) is identical.
 */
export async function assembleFeedEntries(
  slice: RawFeedEvent[],
  viewerId: string
): Promise<FeedEntry[]> {
  if (slice.length === 0) return [];

  const userIds = Array.from(new Set(slice.map((e) => e.run.userId)));
  const usersById = new Map<
    string,
    { hunterName: string; imageUrl: string | null }
  >();
  try {
    const client = await clerkClient();
    // Explicit limit, Clerk defaults to 10. See the matching note in
    // getHunterSummariesByIds for the full story.
    const list = await client.users.getUserList({
      userId: userIds,
      limit: Math.min(userIds.length, 500),
    });
    for (const u of list.data) {
      usersById.set(u.id, resolveHunterDisplay(u));
    }
  } catch {
    // If Clerk is unreachable, fall through with empty map, entries
    // render with the "Hunter" placeholder rather than crashing.
  }

  const reactionRows = await prisma.reaction.findMany({
    where: { eventId: { in: slice.map((e) => e.id) } },
    select: { eventId: true, userId: true, emoji: true },
  });
  const reactionsByEvent = new Map<number, ReactionSummary[]>();
  for (const r of reactionRows) {
    let arr = reactionsByEvent.get(r.eventId);
    if (!arr) {
      arr = [];
      reactionsByEvent.set(r.eventId, arr);
    }
    let summary = arr.find((s) => s.emoji === r.emoji);
    if (!summary) {
      summary = { emoji: r.emoji, count: 0, userReacted: false };
      arr.push(summary);
    }
    summary.count++;
    if (r.userId === viewerId) summary.userReacted = true;
  }

  return slice.map((e) => {
    const u =
      usersById.get(e.run.userId) ?? LEGACY_AUTHOR_MAP.get(e.run.userId);
    return {
      id: e.id,
      hunterId: e.run.userId,
      hunterName: u?.hunterName ?? "Hunter",
      imageUrl: u?.imageUrl ?? null,
      dungeonId: e.run.dungeonId,
      type: e.type,
      date: e.date.toISOString().split("T")[0],
      note: e.note ?? "",
      createdAt: e.createdAt.toISOString(),
      reactions: reactionsByEvent.get(e.id) ?? [],
    };
  });
}

/**
 * Toggles the viewer's reaction on an event. If a row exists for
 * (event, viewer, emoji) it's deleted; otherwise one is inserted.
 * Returns the post-toggle state so the client can confirm its
 * optimistic update.
 *
 * Rejects emoji not in REACTION_EMOJI_SET so the table can't be filled
 * with arbitrary user input.
 */
export async function toggleReaction(
  eventId: number,
  emoji: string
): Promise<{ active: boolean }> {
  const userId = await requireUserId();

  if (!REACTION_EMOJI_SET.has(emoji)) {
    throw new Error("Unsupported reaction emoji");
  }

  // Reactions only land on public, noted entries, same gate the feed
  // uses, so a private entry can't accidentally become reactable via
  // a direct API call.
  const event = await prisma.dungeonEvent.findUnique({
    where: { id: eventId },
    select: { id: true, isPublic: true, note: true },
  });
  if (!event || !event.isPublic || !event.note) {
    throw new Error("Event not found or not public");
  }

  const existing = await prisma.reaction.findUnique({
    where: { eventId_userId_emoji: { eventId, userId, emoji } },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { active: false };
  }
  await prisma.reaction.create({ data: { eventId, userId, emoji } });
  return { active: true };
}
