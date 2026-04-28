import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { isEkadashi } from "@/lib/quests";

export const dynamic = "force-dynamic";

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

const EKADASHI_PAYLOAD: PushPayload = {
  title: "⚡ Ekadashi side quest unlocked",
  body: "Fast on cooked food until sundown. Tap to view the quest.",
  url: "/",
};

function pickMessage(args: {
  relapsedYesterday: number;
  questsYesterday: number;
  totalQuestsEver: number;
}): PushPayload | null {
  const { relapsedYesterday, questsYesterday, totalQuestsEver } = args;

  if (relapsedYesterday > 0) {
    return {
      title: "⚡ A new day, Hunter",
      body: "Yesterday's fall doesn't define today. Step back into the dungeon.",
      url: "/",
    };
  }
  if (totalQuestsEver > 0 && questsYesterday === 0) {
    return {
      title: "⚠ Scattered yesterday",
      body: "Break the pattern. One quest is enough to forge the day.",
      url: "/",
    };
  }
  if (questsYesterday > 0) {
    return {
      title: "⚔ Daily quests reset",
      body: "Keep the combo alive. Today's quests await.",
      url: "/",
    };
  }
  return null;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayUtc = startOfUtcDay(now);
  const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 60 * 60 * 1000);
  const todayIso = todayUtc.toISOString().split("T")[0];
  const ekadashiToday = isEkadashi(todayIso);

  const userIds = (
    await prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })
  ).map((r) => r.userId);

  const summary = {
    users: userIds.length,
    ekadashi: ekadashiToday,
    sent: 0,
    removed: 0,
    skipped: 0,
    byType: { relapse: 0, scattered: 0, reset: 0, ekadashi: 0, none: 0 },
  };

  for (const userId of userIds) {
    const [
      relapsedYesterday,
      questsYesterday,
      totalQuestsEver,
      ekadashiCompletedToday,
    ] = await Promise.all([
      prisma.dungeonRun.count({
        where: {
          userId,
          endReason: "relapse",
          updatedAt: { gte: yesterdayUtc, lt: todayUtc },
        },
      }),
      prisma.questCompletion.count({
        where: { userId, date: yesterdayUtc },
      }),
      prisma.questCompletion.count({ where: { userId } }),
      ekadashiToday
        ? prisma.questCompletion.count({
            where: {
              userId,
              questId: "ekadashi-fast",
              date: todayUtc,
            },
          })
        : Promise.resolve(0),
    ]);

    // Ekadashi morning + user hasn't completed it yet → ekadashi push wins.
    if (ekadashiToday && ekadashiCompletedToday === 0) {
      summary.byType.ekadashi++;
      const result = await sendPushToUser(userId, EKADASHI_PAYLOAD);
      summary.sent += result.sent;
      summary.removed += result.removed;
      continue;
    }

    const payload = pickMessage({
      relapsedYesterday,
      questsYesterday,
      totalQuestsEver,
    });

    if (!payload) {
      summary.skipped++;
      summary.byType.none++;
      continue;
    }

    if (payload.title.startsWith("⚡")) summary.byType.relapse++;
    else if (payload.title.startsWith("⚠")) summary.byType.scattered++;
    else summary.byType.reset++;

    const result = await sendPushToUser(userId, payload);
    summary.sent += result.sent;
    summary.removed += result.removed;
  }

  return NextResponse.json({ ok: true, ...summary });
}