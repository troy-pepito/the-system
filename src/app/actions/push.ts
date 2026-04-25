"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const userId = await requireUserId();
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    update: {
      userId,
      p256dh: input.p256dh,
      auth: input.auth,
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

export async function sendTestPushToSelf(): Promise<{
  sent: number;
  removed: number;
  subscriptions: number;
}> {
  const userId = await requireUserId();
  const subs = await prisma.pushSubscription.count({ where: { userId } });
  const result = await sendPushToUser(userId, {
    title: "✓ Test notification",
    body: "If you see this, push is wired up correctly.",
    url: "/profile",
  });
  return { ...result, subscriptions: subs };
}