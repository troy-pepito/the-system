"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

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
  await requireUserId();

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

  const userIds = Array.from(new Set(slice.map((e) => e.run.userId)));
  const client = await clerkClient();
  const usersById = new Map<
    string,
    {
      hunterName: string;
      imageUrl: string | null;
    }
  >();
  try {
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
    };
  });

  return { entries, nextCursor };
}
