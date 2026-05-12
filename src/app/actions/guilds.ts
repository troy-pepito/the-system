"use server";

import { unstable_cache, updateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getHunterSummariesByIds } from "@/app/actions/achievements";
import { assembleFeedEntries } from "@/app/actions/feed";
import {
  FEED_PAGE_SIZE,
  type FeedEntry,
  type FeedPage,
} from "@/lib/feed";
import { resolveHunterDisplay } from "@/lib/hunterDisplay";
import { sendPushToUser } from "@/lib/push";
import {
  GUILD_MEMBER_CAP,
  slugifyGuildName,
  type GuildDetail,
  type GuildSummary,
  type GuildListItem,
} from "@/lib/guilds";

const TAG = "guild";

/**
 * Filter a userId list to those whose Clerk account still exists.
 * Orphans (Clerk-deleted users with leftover DB rows) get dropped so
 * guild member counts don't inflate from accounts that no longer
 * exist. On transient Clerk failure returns the input as-is rather
 * than fake-vanishing everyone.
 *
 * This catches the case where a user was deleted from the Clerk
 * dashboard (or via any path that bypasses deleteAccount, which is
 * the only path that cleans up our DB rows). deleteAccount itself
 * already wipes guildMember rows, so for in-app deletes this filter
 * is a no-op.
 */
/** Cached inner. Cache key is the sorted+joined id list, so different
 *  callers passing the same set in different orders hit the same entry.
 *  300s revalidate is plenty: Clerk users rarely come/go minute-to-minute,
 *  and the orphan-filter's job is "weed out long-deleted accounts," not
 *  "react in real time." Tag lets webhook-driven user-list changes
 *  invalidate explicitly when we wire that up later. */
const _filterToActiveUserIds = unstable_cache(
  async (sortedKey: string): Promise<string[]> => {
    const userIds = sortedKey.split(",");
    try {
      const client = await clerkClient();
      const list = await client.users.getUserList({
        userId: userIds,
        limit: Math.min(userIds.length, 500),
      });
      const activeIds = new Set(list.data.map((u) => u.id));
      return userIds.filter((id) => activeIds.has(id));
    } catch {
      return userIds;
    }
  },
  ["filter-active-clerk-users"],
  { revalidate: 300, tags: ["clerk:users"] }
);

async function filterToActiveUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const sortedKey = [...userIds].sort().join(",");
  return _filterToActiveUserIds(sortedKey);
}

/** "One guild per user" rule, checks for any accepted membership. */
async function hasAcceptedMembership(userId: string): Promise<boolean> {
  const row = await prisma.guildMember.findFirst({
    where: { userId, status: "accepted" },
    select: { id: true },
  });
  return row !== null;
}

export async function createGuild(input: {
  name: string;
  description?: string;
}): Promise<{ slug: string }> {
  const userId = await requireUserId();
  const name = input.name.trim();
  if (name.length < 3 || name.length > 32) {
    throw new Error("Guild name must be 3–32 characters");
  }
  const slug = slugifyGuildName(name);
  if (slug.length < 3) {
    throw new Error("Guild name must contain at least 3 letters/numbers");
  }
  if (await hasAcceptedMembership(userId)) {
    throw new Error("You're already in a guild, leave it first");
  }

  // Case-insensitive name uniqueness, Prisma's @unique on `name` is
  // exact-match, so we check manually before insert. Combined with the
  // schema-level unique, race conditions still surface as a friendly
  // error rather than a stack trace.
  const existingByName = await prisma.guild.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingByName) throw new Error("That guild name is taken");
  const existingBySlug = await prisma.guild.findUnique({ where: { slug } });
  if (existingBySlug) throw new Error("That guild name is taken");

  const guild = await prisma.guild.create({
    data: {
      slug,
      name,
      description: input.description?.trim() || null,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "owner",
          status: "accepted",
        },
      },
    },
  });
  updateTag(TAG);
  return { slug: guild.slug };
}

async function _getGuildBySlug(
  slug: string,
  viewerId: string
): Promise<GuildDetail | null> {
  const guild = await prisma.guild.findUnique({
    where: { slug },
    include: { members: { orderBy: { joinedAt: "asc" } } },
  });
  if (!guild) return null;

  const acceptedIds = guild.members
    .filter((m) => m.status === "accepted")
    .map((m) => m.userId);
  const pendingIds = guild.members
    .filter((m) => m.status === "pending")
    .map((m) => m.userId);

  // Pending list is owner-only, non-owners shouldn't see who else
  // is mid-application.
  const isOwner = guild.ownerId === viewerId;
  const [acceptedSummaries, pendingSummaries] = await Promise.all([
    getHunterSummariesByIds(acceptedIds),
    isOwner ? getHunterSummariesByIds(pendingIds) : Promise.resolve([]),
  ]);

  const viewerMember = guild.members.find((m) => m.userId === viewerId);
  let viewerStatus: GuildSummary["viewerStatus"] = "none";
  if (isOwner) viewerStatus = "owner";
  else if (viewerMember?.status === "accepted") viewerStatus = "member";
  else if (viewerMember?.status === "pending") viewerStatus = "pending";

  // acceptedSummaries is already orphan-filtered (getHunterSummariesByIds
  // drops Clerk-deleted users), so its length is the live member count.
  // Same logic for pendingSummaries when the viewer is the owner;
  // non-owners get a raw count since they don't see the pending list
  // anyway. Catches the case where an alt account was deleted via the
  // Clerk dashboard and its GuildMember row was orphaned.
  return {
    id: guild.id,
    slug: guild.slug,
    name: guild.name,
    description: guild.description,
    ownerId: guild.ownerId,
    memberCount: acceptedSummaries.length,
    pendingCount: isOwner ? pendingSummaries.length : pendingIds.length,
    viewerStatus,
    members: acceptedSummaries,
    pending: pendingSummaries,
    createdAt: guild.createdAt.toISOString(),
  };
}

export async function getGuildBySlug(slug: string): Promise<GuildDetail | null> {
  const userId = await requireUserId();
  // Direct query (no unstable_cache), the inner getHunterSummariesByIds
  // already caches per-user snapshots, so the only added cost is the
  // single guild + members findUnique. Caching the wrapper introduced a
  // stale-null bug right after createGuild, the page 404'd despite the
  // row existing in the directory.
  return _getGuildBySlug(slug, userId);
}

export async function getMyGuild(): Promise<GuildSummary | null> {
  const userId = await requireUserId();
  // Fetch the viewer's guild + the accepted-member userIds so we can
  // filter out orphans (Clerk-deleted accounts whose GuildMember row
  // was left behind, e.g. an alt deleted via Clerk dashboard).
  const member = await prisma.guildMember.findFirst({
    where: { userId, status: "accepted" },
    include: {
      guild: {
        include: {
          members: {
            where: { status: "accepted" },
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!member) return null;
  const acceptedIds = member.guild.members.map((m) => m.userId);
  const liveIds = await filterToActiveUserIds(acceptedIds);
  const pendingCount =
    member.guild.ownerId === userId
      ? await prisma.guildMember.count({
          where: { guildId: member.guild.id, status: "pending" },
        })
      : 0;
  return {
    id: member.guild.id,
    slug: member.guild.slug,
    name: member.guild.name,
    description: member.guild.description,
    ownerId: member.guild.ownerId,
    memberCount: liveIds.length,
    pendingCount,
    viewerStatus: member.guild.ownerId === userId ? "owner" : "member",
  };
}

export async function requestJoinGuild(slug: string): Promise<void> {
  const userId = await requireUserId();
  if (await hasAcceptedMembership(userId)) {
    throw new Error("You're already in a guild, leave it first");
  }
  const guild = await prisma.guild.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, name: true },
  });
  if (!guild) throw new Error("Guild not found");

  // Hard cap check on the request side, an at-cap guild shouldn't
  // accumulate pending requests it can never approve.
  const acceptedCount = await prisma.guildMember.count({
    where: { guildId: guild.id, status: "accepted" },
  });
  if (acceptedCount >= GUILD_MEMBER_CAP) {
    throw new Error("Guild is at capacity");
  }

  await prisma.guildMember.upsert({
    where: { guildId_userId: { guildId: guild.id, userId } },
    create: {
      guildId: guild.id,
      userId,
      role: "member",
      status: "pending",
    },
    // If a row already exists (e.g. a previous decline left it
    // around) just resurface the pending state.
    update: { status: "pending" },
  });
  updateTag(TAG);

  try {
    const client = await clerkClient();
    const requester = await client.users.getUser(userId);
    const { hunterName } = resolveHunterDisplay(requester);
    await sendPushToUser(guild.ownerId, {
      title: "⚔ Guild Join Request",
      body: `${hunterName} wants to join ${guild.name}.`,
      url: `/g/${slug}`,
    });
  } catch {}
}

/**
 * Withdraw a pending join request the viewer sent. Idempotent, a
 * request that's already been approved or declined leaves no row to
 * delete. Mirrors declineJoin but caller is the applicant.
 */
export async function cancelJoinGuildRequest(slug: string): Promise<void> {
  const userId = await requireUserId();
  const guild = await prisma.guild.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!guild) return;
  await prisma.guildMember.deleteMany({
    where: {
      guildId: guild.id,
      userId,
      status: "pending",
    },
  });
  updateTag(TAG);
}

async function requireOwner(slug: string): Promise<{
  guildId: number;
  ownerId: string;
}> {
  const userId = await requireUserId();
  const guild = await prisma.guild.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!guild) throw new Error("Guild not found");
  if (guild.ownerId !== userId) throw new Error("Only the owner can do that");
  return { guildId: guild.id, ownerId: userId };
}

export async function approveJoin(
  slug: string,
  applicantId: string
): Promise<void> {
  const { guildId } = await requireOwner(slug);

  // Cap is checked again at approve-time, the guild may have filled
  // up between request and approval.
  const acceptedCount = await prisma.guildMember.count({
    where: { guildId, status: "accepted" },
  });
  if (acceptedCount >= GUILD_MEMBER_CAP) {
    throw new Error("Guild is at capacity");
  }

  // Applicant might have joined a different guild while their request
  // was pending. Block approval if they're already in one, keeps the
  // "one guild per user" rule honest.
  const applicantHasGuild = await prisma.guildMember.findFirst({
    where: { userId: applicantId, status: "accepted" },
    select: { id: true },
  });
  if (applicantHasGuild) {
    // Clean up the now-orphan pending row so it doesn't linger in the
    // owner's list forever.
    await prisma.guildMember.deleteMany({
      where: { guildId, userId: applicantId, status: "pending" },
    });
    updateTag(TAG);
    throw new Error("That hunter joined another guild");
  }

  const result = await prisma.guildMember.updateMany({
    where: { guildId, userId: applicantId, status: "pending" },
    data: { status: "accepted" },
  });
  if (result.count === 0) return;

  // Auto-decline this hunter's other pending requests now that they
  // have a home, keeps the experience tidy.
  await prisma.guildMember.deleteMany({
    where: {
      userId: applicantId,
      status: "pending",
      guildId: { not: guildId },
    },
  });
  updateTag(TAG);

  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { name: true, slug: true },
    });
    if (guild) {
      await sendPushToUser(applicantId, {
        title: "✓ Welcome to the Guild",
        body: `${guild.name} accepted your request.`,
        url: `/g/${guild.slug}`,
      });
    }
  } catch {}
}

export async function declineJoin(
  slug: string,
  applicantId: string
): Promise<void> {
  const { guildId } = await requireOwner(slug);
  await prisma.guildMember.deleteMany({
    where: { guildId, userId: applicantId, status: "pending" },
  });
  updateTag(TAG);
}

export async function kickMember(
  slug: string,
  memberUserId: string
): Promise<void> {
  const { guildId, ownerId } = await requireOwner(slug);
  // Owner can't kick themselves, disbandGuild is the right tool when
  // they want to dissolve. Allowing self-kick would leave the guild
  // ownerless, since GuildMember.role is informational while the
  // authoritative owner pointer lives on Guild.ownerId.
  if (memberUserId === ownerId) {
    throw new Error("Owners can't kick themselves, disband instead");
  }
  await prisma.guildMember.deleteMany({
    where: { guildId, userId: memberUserId, status: "accepted" },
  });
  updateTag(TAG);

  // Soft-notify the kicked hunter so they don't refresh and wonder
  // where their guild went. Best-effort, push failures are silent.
  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { name: true },
    });
    if (guild) {
      await sendPushToUser(memberUserId, {
        title: "Guild Update",
        body: `You were removed from ${guild.name}.`,
        url: "/guilds",
      });
    }
  } catch {}
}

export async function leaveGuild(): Promise<void> {
  const userId = await requireUserId();
  const member = await prisma.guildMember.findFirst({
    where: { userId, status: "accepted" },
    include: { guild: { select: { id: true, ownerId: true, slug: true } } },
  });
  if (!member) return;

  // Owners can't simply leave, they'd orphan the guild. Disbanding
  // (delete the whole guild) is a separate, more deliberate action.
  if (member.guild.ownerId === userId) {
    throw new Error("Owners must disband the guild instead of leaving");
  }

  await prisma.guildMember.delete({ where: { id: member.id } });
  updateTag(TAG);
}

export async function editGuild(
  slug: string,
  input: { name?: string; description?: string }
): Promise<void> {
  const { guildId } = await requireOwner(slug);

  // Slug stays stable across renames, changing it would 404 every
  // shared link to this guild. Only the display name + description
  // are editable. If the player wants a different URL, they'd have
  // to disband and recreate.
  const data: { name?: string; description?: string | null } = {};

  if (typeof input.name === "string") {
    const trimmed = input.name.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      throw new Error("Guild name must be 3–32 characters");
    }
    // Case-insensitive uniqueness check, scoped to OTHER guilds.
    const conflict = await prisma.guild.findFirst({
      where: {
        name: { equals: trimmed, mode: "insensitive" },
        id: { not: guildId },
      },
      select: { id: true },
    });
    if (conflict) throw new Error("That guild name is taken");
    data.name = trimmed;
  }

  if (typeof input.description === "string") {
    const trimmed = input.description.trim();
    data.description = trimmed.length > 0 ? trimmed : null;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.guild.update({ where: { id: guildId }, data });
  updateTag(TAG);
}

export async function transferOwnership(
  slug: string,
  newOwnerId: string
): Promise<void> {
  const { guildId, ownerId } = await requireOwner(slug);
  if (newOwnerId === ownerId) return;

  // The new owner must already be a fully accepted member, can't
  // promote a pending applicant or a stranger by id.
  const target = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId, userId: newOwnerId } },
    select: { status: true },
  });
  if (!target || target.status !== "accepted") {
    throw new Error("That hunter isn't a member of this guild");
  }

  // Atomic swap: flip the role on both rows + repoint Guild.ownerId.
  // Without the transaction, a partial failure could leave the guild
  // with two "owner"-roled members or, worse, none.
  await prisma.$transaction([
    prisma.guildMember.updateMany({
      where: { guildId, userId: ownerId },
      data: { role: "member" },
    }),
    prisma.guildMember.updateMany({
      where: { guildId, userId: newOwnerId },
      data: { role: "owner" },
    }),
    prisma.guild.update({
      where: { id: guildId },
      data: { ownerId: newOwnerId },
    }),
  ]);
  updateTag(TAG);

  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { name: true, slug: true },
    });
    if (guild) {
      await sendPushToUser(newOwnerId, {
        title: "👑 Guild Ownership",
        body: `You're now the owner of ${guild.name}.`,
        url: `/g/${guild.slug}`,
      });
    }
  } catch {}
}

export async function disbandGuild(slug: string): Promise<void> {
  const { guildId } = await requireOwner(slug);
  // FK cascade on GuildMember.guildId removes the membership rows.
  await prisma.guild.delete({ where: { id: guildId } });
  updateTag(TAG);
}

export async function getGuildFeed(
  slug: string,
  cursor?: number
): Promise<FeedPage> {
  const viewerId = await requireUserId();

  // Membership gate, only accepted members (including the owner) see
  // the guild feed. Pending applicants and strangers get an empty page
  // back rather than a thrown error so the UI can render a "not a
  // member yet" empty state cleanly.
  const guild = await prisma.guild.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!guild) return { entries: [], nextCursor: null };

  const memberRows = await prisma.guildMember.findMany({
    where: { guildId: guild.id, status: "accepted" },
    select: { userId: true },
  });
  const memberIds = memberRows.map((r) => r.userId);
  if (!memberIds.includes(viewerId)) {
    return { entries: [], nextCursor: null };
  }

  const events = await prisma.dungeonEvent.findMany({
    where: {
      isPublic: true,
      note: { not: null },
      run: { userId: { in: memberIds } },
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: { run: { select: { userId: true, dungeonId: true } } },
    orderBy: { id: "desc" },
    take: FEED_PAGE_SIZE + 1,
  });

  const slice = events.slice(0, FEED_PAGE_SIZE);
  const nextCursor =
    events.length > FEED_PAGE_SIZE && slice.length > 0
      ? slice[slice.length - 1].id
      : null;
  const entries: FeedEntry[] = await assembleFeedEntries(slice, viewerId);
  return { entries, nextCursor };
}

/** Cached directory build. Same data for every signed-in viewer, so
 *  the cache is shared. Tag-invalidated on any guild mutation (create,
 *  update, delete, member changes all call updateTag(TAG)) — that's
 *  what makes caching safe here despite the freshly-created-guild
 *  visibility requirement we previously couldn't square. */
const _browseGuilds = unstable_cache(
  async (): Promise<GuildListItem[]> => {
    const guilds = await prisma.guild.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        members: {
          where: { status: "accepted" },
          select: { userId: true },
        },
      },
    });
    const allMemberIds = Array.from(
      new Set(guilds.flatMap((g) => g.members.map((m) => m.userId)))
    );
    const liveIds = new Set(await filterToActiveUserIds(allMemberIds));
    return guilds.map((g) => {
      const liveCount = g.members.filter((m) => liveIds.has(m.userId)).length;
      return {
        slug: g.slug,
        name: g.name,
        description: g.description,
        memberCount: liveCount,
        spotsLeft: Math.max(0, GUILD_MEMBER_CAP - liveCount),
      };
    });
  },
  ["browse-guilds"],
  { revalidate: 60, tags: [TAG] }
);

export async function browseGuilds(): Promise<GuildListItem[]> {
  await requireUserId();
  return _browseGuilds();
}
