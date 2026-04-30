"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  REACTION_EMOJI_SET,
  type ReactionSummary,
} from "@/lib/reactions";

export interface FeedEntry {
  id: number;
  hunterId: string;
  hunterName: string;
  imageUrl: string | null;
  dungeonId: string;
  type: string; // "journal" | "relapse" | "completed"
  date: string;
  note: string;
  createdAt: string;
  reactions: ReactionSummary[];
}

export interface FeedPage {
  entries: FeedEntry[];
  /** id of the last returned entry — pass back to fetch the next page. null when there are no more. */
  nextCursor: number | null;
}

const PAGE_SIZE = 20;

/**
 * Fetches public hunter journal entries (notes flagged isPublic) across
 * every hunter, newest first. Cursor-paginated by event id — events are
 * append-only and id is monotonic, so id < cursor is a safe ordering.
 *
 * Reads Clerk in batch for the slice's authors so each page is one
 * Postgres query + one Clerk batch lookup, not N round-trips.
 */
export async function getPublicFeed(
  cursor?: number
): Promise<FeedPage> {
  const viewerId = await requireUserId();

  const events = await prisma.dungeonEvent.findMany({
    where: {
      isPublic: true,
      note: { not: null },
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: { run: { select: { userId: true, dungeonId: true } } },
    orderBy: { id: "desc" },
    // +1 so we can tell whether another page exists without a count query.
    take: PAGE_SIZE + 1,
  });

  const slice = events.slice(0, PAGE_SIZE);
  const nextCursor =
    events.length > PAGE_SIZE && slice.length > 0
      ? slice[slice.length - 1].id
      : null;

  if (slice.length === 0) {
    return { entries: [], nextCursor: null };
  }

  // Hunter info: one batched Clerk lookup for the page's authors.
  const userIds = Array.from(new Set(slice.map((e) => e.run.userId)));
  const usersById = new Map<
    string,
    { hunterName: string; imageUrl: string | null }
  >();
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({ userId: userIds });
    for (const u of list.data) {
      const meta = u.unsafeMetadata as { hunterName?: string } | undefined;
      const name =
        meta?.hunterName ||
        u.firstName ||
        u.username ||
        u.primaryEmailAddress?.emailAddress.split("@")[0] ||
        "Hunter";
      usersById.set(u.id, { hunterName: name, imageUrl: u.imageUrl ?? null });
    }
  } catch {
    // If Clerk is unreachable, fall through with empty map — entries
    // render with the "Hunter" placeholder rather than crashing.
  }

  // Reactions: one query for the whole page's events, then aggregate
  // in memory into per-entry summaries.
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

  const entries: FeedEntry[] = slice.map((e) => {
    const u = usersById.get(e.run.userId);
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

  return { entries, nextCursor };
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

  // Reactions only land on public, noted entries — same gate the feed
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
