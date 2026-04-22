import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";
import { streakRecoveryHtml } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://solo-system.vercel.app";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const threeDaysAgo = new Date(now - THREE_DAYS_MS);
  const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);

  const activeRuns = await prisma.dungeonRun.findMany({
    where: { active: true },
    select: { userId: true },
    distinct: ["userId"],
  });

  const summary = {
    activeUsers: activeRuns.length,
    inactive: 0,
    alreadyEmailed: 0,
    noEmailAddress: 0,
    sent: 0,
    failed: 0,
  };

  const client = await clerkClient();

  for (const { userId } of activeRuns) {
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
    summary.inactive++;

    const recentEmail = await prisma.emailSent.findFirst({
      where: {
        userId,
        type: "streak_recovery",
        sentAt: { gte: sevenDaysAgo },
      },
    });
    if (recentEmail) {
      summary.alreadyEmailed++;
      continue;
    }

    let user;
    try {
      user = await client.users.getUser(userId);
    } catch {
      summary.failed++;
      continue;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      summary.noEmailAddress++;
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

    if (result.skipped) {
      summary.failed++;
      continue;
    }
    if (!result.ok) {
      summary.failed++;
      console.error("[streak-recovery] send failed", userId, result.error);
      continue;
    }

    await prisma.emailSent.create({
      data: { userId, type: "streak_recovery" },
    });
    summary.sent++;
  }

  return NextResponse.json({ ok: true, ...summary });
}