import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userIds = (
    await prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })
  ).map((r) => r.userId);

  const summary = { users: userIds.length, sent: 0, removed: 0 };

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, {
      title: "⚔ Daily quests reset",
      body: "Forge on, Hunter. Complete today's quests to keep your combo alive.",
      url: "/",
    });
    summary.sent += result.sent;
    summary.removed += result.removed;
  }

  return NextResponse.json({ ok: true, ...summary });
}