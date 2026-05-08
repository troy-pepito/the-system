"use server";

import { unstable_cache, updateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getHunterSummariesByIds } from "@/app/actions/achievements";
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

/** "One guild per user" rule — checks for any accepted membership. */
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
    throw new Error("You're already in a guild — leave it first");
  }

  // Case-insensitive name uniqueness — Prisma's @unique on `name` is
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

const _getGuildBySlug = async (
  slug: string,
  viewerId: string
): Promise<GuildDetail | null> => {
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

  // Pending list is owner-only — non-owners shouldn't see who else
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

  return {
    id: guild.id,
    slug: guild.slug,
    name: guild.name,
    description: guild.description,
    ownerId: guild.ownerId,
    memberCount: acceptedIds.length,
    pendingCount: pendingIds.length,
    viewerStatus,
    members: acceptedSummaries,
    pending: pendingSummaries,
    createdAt: guild.createdAt.toISOString(),
  };
};

const getGuildBySlugCached = unstable_cache(_getGuildBySlug, ["guild-by-slug"], {
  tags: [TAG],
});

export async function getGuildBySlug(slug: string): Promise<GuildDetail | null> {
  const userId = await requireUserId();
  return getGuildBySlugCached(slug, userId);
}

export async function getMyGuild(): Promise<GuildSummary | null> {
  const userId = await requireUserId();
  const member = await prisma.guildMember.findFirst({
    where: { userId, status: "accepted" },
    include: {
      guild: {
        include: {
          _count: {
            select: { members: { where: { status: "accepted" } } },
          },
        },
      },
    },
  });
  if (!member) return null;
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
    memberCount: member.guild._count.members,
    pendingCount,
    viewerStatus: member.guild.ownerId === userId ? "owner" : "member",
  };
}

export async function requestJoinGuild(slug: string): Promise<void> {
  const userId = await requireUserId();
  if (await hasAcceptedMembership(userId)) {
    throw new Error("You're already in a guild — leave it first");
  }
  const guild = await prisma.guild.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, name: true },
  });
  if (!guild) throw new Error("Guild not found");

  // Hard cap check on the request side — an at-cap guild shouldn't
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

  // Cap is checked again at approve-time — the guild may have filled
  // up between request and approval.
  const acceptedCount = await prisma.guildMember.count({
    where: { guildId, status: "accepted" },
  });
  if (acceptedCount >= GUILD_MEMBER_CAP) {
    throw new Error("Guild is at capacity");
  }

  // Applicant might have joined a different guild while their request
  // was pending. Block approval if they're already in one — keeps the
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
  // have a home — keeps the experience tidy.
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

export async function leaveGuild(): Promise<void> {
  const userId = await requireUserId();
  const member = await prisma.guildMember.findFirst({
    where: { userId, status: "accepted" },
    include: { guild: { select: { id: true, ownerId: true, slug: true } } },
  });
  if (!member) return;

  // Owners can't simply leave — they'd orphan the guild. Disbanding
  // (delete the whole guild) is a separate, more deliberate action.
  if (member.guild.ownerId === userId) {
    throw new Error("Owners must disband the guild instead of leaving");
  }

  await prisma.guildMember.delete({ where: { id: member.id } });
  updateTag(TAG);
}

export async function disbandGuild(slug: string): Promise<void> {
  const { guildId } = await requireOwner(slug);
  // FK cascade on GuildMember.guildId removes the membership rows.
  await prisma.guild.delete({ where: { id: guildId } });
  updateTag(TAG);
}

const _browseGuilds = async (): Promise<GuildListItem[]> => {
  // Lightweight directory — newest first, with accepted-only counts.
  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: {
        select: { members: { where: { status: "accepted" } } },
      },
    },
  });
  return guilds.map((g) => ({
    slug: g.slug,
    name: g.name,
    description: g.description,
    memberCount: g._count.members,
    spotsLeft: Math.max(0, GUILD_MEMBER_CAP - g._count.members),
  }));
};

const browseGuildsCached = unstable_cache(_browseGuilds, ["browse-guilds"], {
  tags: [TAG],
});

export async function browseGuilds(): Promise<GuildListItem[]> {
  await requireUserId();
  return browseGuildsCached();
}
