"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  getHunterSummariesByIds,
  type HunterSummary,
} from "@/app/actions/achievements";
import { resolveHunterDisplay } from "@/lib/hunterDisplay";
import { sendPushToUser } from "@/lib/push";

export type FriendStatus =
  | "self"
  | "friends"
  | "pending_in"
  | "pending_out"
  | "none";

export type FriendCard = HunterSummary;

export interface PendingRequest {
  requesterId: string;
  hunterName: string;
  imageUrl: string | null;
  createdAt: string;
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
    const { hunterName: name } = resolveHunterDisplay(requester);
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
    const { hunterName: name } = resolveHunterDisplay(accepter);
    await sendPushToUser(requesterId, {
      title: "✓ Friend Request Accepted",
      body: `${name} accepted your request.`,
      url: `/h/${userId}`,
    });
  } catch {}
}

/**
 * Cancel a friend request the viewer sent (status pending_out). Same
 * shape as declineFriend but addressed-from rather than addressed-to:
 * the viewer is the requester, deletes their own outbound row.
 */
export async function cancelFriendRequest(targetId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.friendship.deleteMany({
    where: {
      requesterId: userId,
      addresseeId: targetId,
      status: "pending",
    },
  });
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

  // Batch fetch — one Clerk getUserList for the whole friend set,
  // snapshots run in parallel inside getHunterSummariesByIds. Replaces
  // the previous N+1 (one Clerk roundtrip per friend) which got bad
  // fast at 20+ friends and would have been brutal for 50-member
  // guilds reusing the same shape.
  return getHunterSummariesByIds(friendIds);
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const userId = await requireUserId();
  const rows = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return [];

  const requesterIds = rows.map((r) => r.requesterId);
  const createdById = new Map(
    rows.map((r) => [r.requesterId, r.createdAt.toISOString()])
  );

  let users: Array<{
    id: string;
    unsafeMetadata: unknown;
    firstName: string | null;
    username: string | null;
    primaryEmailAddress: { emailAddress: string } | null;
    imageUrl?: string | null;
  }> = [];
  try {
    const client = await clerkClient();
    // Explicit limit — Clerk defaults to 10. See the matching note in
    // getHunterSummariesByIds.
    const list = await client.users.getUserList({
      userId: requesterIds,
      limit: Math.min(requesterIds.length, 500),
    });
    users = list.data;
  } catch {
    return [];
  }

  return users.map((u) => {
    const display = resolveHunterDisplay(u);
    return {
      requesterId: u.id,
      hunterName: display.hunterName,
      imageUrl: display.imageUrl,
      createdAt: createdById.get(u.id) ?? new Date(0).toISOString(),
    };
  });
}