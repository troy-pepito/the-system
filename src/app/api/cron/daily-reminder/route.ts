import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { pickWisdomQuote } from "@/lib/wisdom";
import { DUNGEONS } from "@/lib/dungeons";

export const dynamic = "force-dynamic";

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function startOfUtcWeekMonday(d: Date): Date {
  const today = startOfUtcDay(d);
  const day = today.getUTCDay(); // 0 = Sun
  const offset = (day + 6) % 7; // days since Monday
  return new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
}

/**
 * Returns the names of dungeons where the user has outstanding commitments
 * today (or this week, for cadence). Allowance dungeons are skipped — they
 * have no "do something" pull, just stay-under-limit.
 */
async function getOutstandingDungeons(
  userId: string,
  todayUtc: Date
): Promise<string[]> {
  const runs = await prisma.dungeonRun.findMany({
    where: { userId, active: true },
    select: { id: true, dungeonId: true },
  });
  if (runs.length === 0) return [];

  const outstanding: string[] = [];
  const weekStart = startOfUtcWeekMonday(todayUtc);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(todayUtc.getTime() - 2 * 24 * 60 * 60 * 1000);

  for (const run of runs) {
    const def = DUNGEONS.find((d) => d.id === run.dungeonId);
    if (!def) continue;

    if (def.ruleType === "continuous_streak" || def.ruleType === "timed") {
      const checked = await prisma.dungeonDayCheckIn.findFirst({
        where: { runId: run.id, date: todayUtc },
        select: { id: true },
      });
      if (!checked) outstanding.push(def.name);
    } else if (def.ruleType === "cadence") {
      const target = def.cadence?.weeklyTarget ?? 5;
      const weekCount = await prisma.dungeonEvent.count({
        where: { runId: run.id, date: { gte: weekStart, lt: weekEnd } },
      });
      if (weekCount < target) outstanding.push(def.name);
    } else if (def.ruleType === "progressive") {
      const recent = await prisma.dungeonEvent.count({
        where: { runId: run.id, date: { gte: twoDaysAgo } },
      });
      if (recent === 0) outstanding.push(def.name);
    }
    // allowance: skip — there's nothing the user has to "do."
  }

  return outstanding;
}

function outstandingPayload(names: string[]): PushPayload {
  const summary =
    names.length <= 2
      ? names.join(", ")
      : `${names[0]}, ${names[1]} +${names.length - 2} more`;
  return {
    title: "📋 Hunter, dungeons await",
    body: `Outstanding: ${summary}.`,
    url: "/",
  };
}

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
  const wisdomFallback: PushPayload = {
    ...pickWisdomQuote(todayIso),
    url: "/",
  };

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
    byType: { relapse: 0, outstanding: 0, scattered: 0, reset: 0, wisdom: 0 },
  };

  for (const userId of userIds) {
    const [
      relapsedYesterday,
      questsYesterday,
      totalQuestsEver,
      outstandingDungeons,
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
      getOutstandingDungeons(userId, todayUtc),
    ]);

    // Priority chain: relapse > outstanding > scattered/reset > wisdom.
    // "Outstanding" is the new actionable nudge — beats the soft scattered
    // / reset signals because it names specific commitments the player can
    // act on right now.
    let payload: PushPayload;
    let kind: keyof typeof summary.byType;
    if (relapsedYesterday > 0) {
      payload = {
        title: "⚡ A new day, Hunter",
        body: "Yesterday's fall doesn't define today. Step back into the dungeon.",
        url: "/",
      };
      kind = "relapse";
    } else if (outstandingDungeons.length > 0) {
      payload = outstandingPayload(outstandingDungeons);
      kind = "outstanding";
    } else {
      const stateMessage = pickMessage({
        relapsedYesterday,
        questsYesterday,
        totalQuestsEver,
      });
      if (stateMessage && stateMessage.title.startsWith("⚠")) {
        payload = stateMessage;
        kind = "scattered";
      } else if (stateMessage) {
        payload = stateMessage;
        kind = "reset";
      } else {
        payload = wisdomFallback;
        kind = "wisdom";
      }
    }

    summary.byType[kind]++;
    const result = await sendPushToUser(userId, payload);
    summary.sent += result.sent;
    summary.removed += result.removed;
  }

  return NextResponse.json({ ok: true, ...summary });
}