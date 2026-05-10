import type { HunterSummary } from "@/app/actions/achievements";

/** Hard cap. Started at 50, dropped to 10 on 2026-05-09, Troy:
 *  "embarrassing how almost nobody uses this app a lot yet, so maybe
 *  we can change that to 50 later on". A small cap makes a 2-3 hunter
 *  guild feel close-to-full instead of cavernously empty. Bump back
 *  up once usage justifies it. */
export const GUILD_MEMBER_CAP = 10;

export interface GuildSummary {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  ownerId: string;
  memberCount: number;
  pendingCount: number;
  /** Authenticated viewer's relationship to this guild, drives the
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
