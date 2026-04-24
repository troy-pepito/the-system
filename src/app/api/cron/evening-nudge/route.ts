import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const todayUtc = startOfUtcDay(new Date());

  const userIds = (
    await prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })
  ).map((r) => r.userId);

  const summary = {
    users: userIds.length,
    sent: 0,
    removed: 0,
    skipped: 0,
  };

  for (const userId of userIds) {
    const [questsToday, totalQuestsEver] = await Promise.all([
      prisma.questCompletion.count({ where: { userId, date: todayUtc } }),
      prisma.questCompletion.count({ where: { userId } }),
    ]);

    if (totalQuestsEver === 0 || questsToday > 0) {
      summary.skipped++;
      continue;
    }

    const result = await sendPushToUser(userId, {
      title: "⏳ Day's closing, Hunter",
      body: "One quest keeps the streak. Don't let today slip.",
      url: "/",
    });
    summary.sent += result.sent;
    summary.removed += result.removed;
  }

  return NextResponse.json({ ok: true, ...summary });
}