"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone?: string;
}): Promise<void> {
  const userId = await requireUserId();
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      timezone: input.timezone,
    },
    update: {
      userId,
      p256dh: input.p256dh,
      auth: input.auth,
      ...(input.timezone ? { timezone: input.timezone } : {}),
    },
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await requireUserId();
  await prisma.pushSubscription
    .delete({ where: { endpoint } })
    .catch(() => {});
}

export async function hasActivePushSubscription(
  endpoint: string
): Promise<boolean> {
  const userId = await requireUserId();
  const found = await prisma.pushSubscription.findFirst({
    where: { userId, endpoint },
    select: { id: true },
  });
  return !!found;
}

/**
 * Dev-only: fire a test push to the calling user's own subscriptions.
 * Returns counts so the UI can show how many devices got it (and how
 * many were silently removed because they expired).
 */
export async function sendTestPush(): Promise<{
  sent: number;
  removed: number;
}> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("sendTestPush is dev-only");
  }
  const userId = await requireUserId();
  return sendPushToUser(userId, {
    title: "🧪 Test push",
    body: "If you're seeing this, the push pipeline works end-to-end.",
    url: "/",
  });
}