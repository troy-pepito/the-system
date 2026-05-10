import type { ReactionSummary } from "@/lib/reactions";

export const FEED_PAGE_SIZE = 20;

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
  /** id of the last returned entry, pass back to fetch the next page. null when there are no more. */
  nextCursor: number | null;
}

/** Raw shape we get back from the prisma DungeonEvent query, only the
 *  fields the feed assembler reads. Lives here so both the server
 *  actions and any future client-side helpers can share the type. */
export interface RawFeedEvent {
  id: number;
  type: string;
  date: Date;
  note: string | null;
  createdAt: Date;
  run: { userId: string; dungeonId: string };
}
