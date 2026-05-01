import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { streakRecoveryHtml } from "@/lib/email-templates";
import { pickWisdomQuote } from "@/lib/wisdom";
import { isEkadashi } from "@/lib/quests";
import { DUNGEONS } from "@/lib/dungeons";

export const dynamic = "force-dynamic";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_TIMEZONE = "Asia/Dubai";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://trojanatoplat-system.vercel.app";

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function startOfUtcWeekMonday(d: Date): Date {
  const today = startOfUtcDay(d);
  const day = today.getUTCDay();
  const offset = (day + 6) % 7;
  return new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
}

function localDateIn(timezone: string, now: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(now);
  } catch {
    return now.toISOString().split("T")[0];
  }
}

function ekadashiPayload(): PushPayload {
  return {
    title: "⚡ Ekadashi side quest unlocked",
    body: "Fast on cooked food until sundown. Tap to view the quest.",
    url: "/",
  };
}

function relapsePayload(): PushPayload {
  return {
    title: "⚡ A new day, Hunter",
    body: "Yesterday's fall doesn't define today. Step back into the dungeon.",
    url: "/",
  };
}

function scatteredPayload(): PushPayload {
  return {
    title: "⚠ Scattered yesterday",
    body: "Break the pattern. One quest is enough to forge the day.",
    url: "/",
  };
}

function resetPayload(): PushPayload {
  return {
    title: "⚔ Daily quests reset",
    body: "Keep the combo alive. Today's quests await.",
    url: "/",
  };
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
      const target = def.cadence?.target ?? 5;
      const isDaily = def.cadence?.window === "day";
      const rangeStart = isDaily ? todayUtc : weekStart;
      const rangeEnd = isDaily
        ? new Date(todayUtc.getTime() + 24 * 60 * 60 * 1000)
        : weekEnd;
      const periodCount = await prisma.dungeonEvent.count({
        where: { runId: run.id, date: { gte: rangeStart, lt: rangeEnd } },
      });
      if (periodCount < target) outstanding.push(def.name);
    } else if (def.ruleType === "progressive") {
      const recent = await prisma.dungeonEvent.count({
        where: { runId: run.id, date: { gte: twoDaysAgo } },
      });
      if (recent === 0) outstanding.push(def.name);
    }
  }
  return outstanding;
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
  const todayIsoUtc = todayUtc.toISOString().split("T")[0];
  const wisdom = pickWisdomQuote(todayIsoUtc);
  const wisdomFallback: PushPayload = { ...wisdom, url: "/" };

  // ---------- PHASE A: morning push (priority chain per user) ----------
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true, timezone: true },
    distinct: ["userId"],
  });

  const pushSummary = {
    users: subs.length,
    sent: 0,
    removed: 0,
    byType: {
      ekadashi: 0,
      relapse: 0,
      outstanding: 0,
      scattered: 0,
      reset: 0,
      wisdom: 0,
    },
  };

  for (const sub of subs) {
    const tz = sub.timezone || FALLBACK_TIMEZONE;
    const localDate = localDateIn(tz, now);
    const ekadashiToday = isEkadashi(localDate);

    const [
      relapsedYesterday,
      questsYesterday,
      totalQuestsEver,
      ekadashiCompletedToday,
      outstandingDungeons,
    ] = await Promise.all([
      prisma.dungeonRun.count({
        where: {
          userId: sub.userId,
          endReason: "relapse",
          updatedAt: { gte: yesterdayUtc, lt: todayUtc },
        },
      }),
      prisma.questCompletion.count({
        where: { userId: sub.userId, date: yesterdayUtc },
      }),
      prisma.questCompletion.count({ where: { userId: sub.userId } }),
      ekadashiToday
        ? prisma.questCompletion.count({
            where: {
              userId: sub.userId,
              questId: "ekadashi-fast",
              date: new Date(`${localDate}T00:00:00Z`),
            },
          })
        : Promise.resolve(0),
      getOutstandingDungeons(sub.userId, todayUtc),
    ]);

    let payload: PushPayload;
    let kind: keyof typeof pushSummary.byType;

    // Priority: ekadashi (rare, special) > relapse > outstanding > scattered > reset > wisdom
    if (ekadashiToday && ekadashiCompletedToday === 0) {
      payload = ekadashiPayload();
      kind = "ekadashi";
    } else if (relapsedYesterday > 0) {
      payload = relapsePayload();
      kind = "relapse";
    } else if (outstandingDungeons.length > 0) {
      payload = outstandingPayload(outstandingDungeons);
      kind = "outstanding";
    } else if (totalQuestsEver > 0 && questsYesterday === 0) {
      payload = scatteredPayload();
      kind = "scattered";
    } else if (questsYesterday > 0) {
      payload = resetPayload();
      kind = "reset";
    } else {
      payload = wisdomFallback;
      kind = "wisdom";
    }

    pushSummary.byType[kind]++;
    const result = await sendPushToUser(sub.userId, payload);
    pushSummary.sent += result.sent;
    pushSummary.removed += result.removed;
  }

  // ---------- PHASE B: streak-recovery email (3+ days inactive, max once/wk) ----------
  const threeDaysAgo = new Date(now.getTime() - THREE_DAYS_MS);
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  const activeRunUsers = await prisma.dungeonRun.findMany({
    where: { active: true },
    select: { userId: true },
    distinct: ["userId"],
  });

  const recoverySummary = {
    activeUsers: activeRunUsers.length,
    inactive: 0,
    alreadyEmailed: 0,
    noEmailAddress: 0,
    sent: 0,
    failed: 0,
  };

  const client = await clerkClient();

  for (const { userId } of activeRunUsers) {
    const [lastQuest, lastEvent] = await Promise.all([
      prisma.questCompletion.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.dungeonEvent.findFirst({
        where: { run: { userId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const lastActivityMs = Math.max(
      lastQuest?.createdAt.getTime() ?? 0,
      lastEvent?.createdAt.getTime() ?? 0
    );
    if (lastActivityMs > threeDaysAgo.getTime()) continue;
    recoverySummary.inactive++;

    const recentEmail = await prisma.emailSent.findFirst({
      where: {
        userId,
        type: "streak_recovery",
        sentAt: { gte: sevenDaysAgo },
      },
    });
    if (recentEmail) {
      recoverySummary.alreadyEmailed++;
      continue;
    }

    let user;
    try {
      user = await client.users.getUser(userId);
    } catch {
      recoverySummary.failed++;
      continue;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      recoverySummary.noEmailAddress++;
      continue;
    }

    const meta = user.unsafeMetadata as { hunterName?: string } | undefined;
    const hunterName =
      meta?.hunterName || user.firstName || email.split("@")[0] || "Hunter";

    const result = await sendEmail({
      to: email,
      subject: "The System awaits your return.",
      html: streakRecoveryHtml({ hunterName, appUrl: APP_URL }),
    });

    if (result.skipped || !result.ok) {
      recoverySummary.failed++;
      if (!result.ok) {
        console.error("[streak-recovery] send failed", userId, result.error);
      }
      continue;
    }

    await prisma.emailSent.create({
      data: { userId, type: "streak_recovery" },
    });
    recoverySummary.sent++;
  }

  return NextResponse.json({
    ok: true,
    push: pushSummary,
    recovery: recoverySummary,
  });
}
