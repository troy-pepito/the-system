import type { HunterSummary } from "@/app/actions/achievements";

/** Hard cap from spec — keeps guild chat / leaderboard tractable and
 *  forces meaningful curation on the owner. */
export const GUILD_MEMBER_CAP = 50;

export interface GuildSummary {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  ownerId: string;
  memberCount: number;
  pendingCount: number;
  /** Authenticated viewer's relationship to this guild — drives the
   *  request/approve/leave UI in one read. */
  viewerStatus: "owner" | "member" | "pending" | "none";
}

export interface GuildDetail extends GuildSummary {
  members: HunterSummary[];
  pending: HunterSummary[];
  createdAt: string;
}

export interface GuildListItem {
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
  /** Cap minus accepted, so the UI can show "12 spots left". */
  spotsLeft: number;
}

/** Lowercase + hyphenated slug derived from a guild name. Strips
 *  diacritics + punctuation so "Dawn Walkers!" → "dawn-walkers".
 *  Lives in lib so the create-form can show a slug preview without
 *  pulling in the server-actions module. */
export function slugifyGuildName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
