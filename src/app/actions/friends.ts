"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getPlayerLevelForUser } from "@/app/actions/achievements";
import { sendPushToUser } from "@/lib/push";

export type FriendStatus =
  | "self"
  | "friends"
  | "pending_in"
  | "pending_out"
  | "none";

export interface FriendCard {
  hunterId: string;
  hunterName: string;
  imageUrl: string | null;
  level: number;
  rank: string;
}

export interface PendingRequest {
  requesterId: string;
  hunterName: string;
  imageUrl: string | null;
  createdAt: string;
}

function clerkDisplayName(user: {
  unsafeMetadata: unknown;
  firstName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}): string {
  const meta = user.unsafeMetadata as { hunterName?: string } | undefined;
  return (
    meta?.hunterName ||
    user.firstName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Hunter"
  );
}

async function levelForUser(
  userId: string
): Promise<{ level: number; rank: string }> {
  const { level, rank } = await getPlayerLevelForUser(userId);
  return { level, rank };
}

export async function requestFriend(targetId: string): Promise<void> {
  const userId = await requireUserId();
  if (targetId === userId) throw new Error("Can't friend yourself");

  // Check existing in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: userId },
      ],
    },
  });
  if (existing) return;

  await prisma.friendship.create({
    data: {
      requesterId: userId,
      addresseeId: targetId,
      status: "pending",
    },
  });

  try {
    const client = await clerkClient();
    const requester = await client.users.getUser(userId);
    const name = clerkDisplayName(requester);
    await sendPushToUser(targetId, {
      title: "⚔ Friend Request",
      body: `${name} wants to connect.`,
      url: "/profile",
    });
  } catch {}
}

export async function acceptFriend(requesterId: string): Promise<void> {
  const userId = await requireUserId();
  const updated = await prisma.friendship.updateMany({
    where: {
      requesterId,
      addresseeId: userId,
      status: "pending",
    },
    data: { status: "accepted" },
  });
  if (updated.count === 0) return;

  try {
    const client = await clerkClient();
    const accepter = await client.users.getUser(userId);
    const name = clerkDisplayName(accepter);
    await sendPushToUser(requesterId, {
      title: "✓ Friend Request Accepted",
      body: `${name} accepted your request.`,
      url: `/h/${userId}`,
    });
  } catch {}
}

export async function declineFriend(requesterId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.friendship.deleteMany({
    where: {
      requesterId,
      addresseeId: userId,
      status: "pending",
    },
  });
}

export async function removeFriend(otherId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: userId },
      ],
      status: "accepted",
    },
  });
}

export async function getFriendStatus(targetId: string): Promise<FriendStatus> {
  const userId = await requireUserId();
  if (targetId === userId) return "self";

  const row = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: userId },
      ],
    },
  });
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  if (row.requesterId === userId) return "pending_out";
  return "pending_in";
}

export async function getFriends(): Promise<FriendCard[]> {
  const userId = await requireUserId();
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, status: "accepted" },
        { addresseeId: userId, status: "accepted" },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  if (rows.length === 0) return [];

  const friendIds = rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId
  );

  const client = await clerkClient();
  const cards = await Promise.all(
    friendIds.map(async (id): Promise<FriendCard | null> => {
      try {
        const user = await client.users.getUser(id);
        const { level, rank } = await levelForUser(id);
        return {
          hunterId: id,
          hunterName: clerkDisplayName(user),
          imageUrl: user.imageUrl ?? null,
          level,
          rank,
        };
      } catch {
        return null;
      }
    })
  );
  return cards.filter((c): c is FriendCard => c !== null);
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const userId = await requireUserId();
  const rows = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return [];

  const client = await clerkClient();
  const out = await Promise.all(
    rows.map(async (row): Promise<PendingRequest | null> => {
      try {
        const user = await client.users.getUser(row.requesterId);
        return {
          requesterId: row.requesterId,
          hunterName: clerkDisplayName(user),
          imageUrl: user.imageUrl ?? null,
          createdAt: row.createdAt.toISOString(),
        };
      } catch {
        return null;
      }
    })
  );
  return out.filter((r): r is PendingRequest => r !== null);
}