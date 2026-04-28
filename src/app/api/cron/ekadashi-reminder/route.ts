import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { isEkadashi } from "@/lib/quests";

export const dynamic = "force-dynamic";

// Vercel Hobby plan only allows daily crons, so this route is invoked
// once per day at 06:00 UTC (= 10:00 UAE = 14:00 PHT). One fixed time
// for all users; per-tz precision is a Pro-plan upgrade away.
const FALLBACK_TIMEZONE = "Asia/Dubai";

const EKADASHI_PAYLOAD: PushPayload = {
  title: "⚡ Ekadashi side quest unlocked",
  body: "Fast on cooked food until sundown. Tap to view the quest.",
  url: "/",
};

function localDateIn(timezone: string, now: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(now); // en-CA → YYYY-MM-DD
  } catch {
    return now.toISOString().split("T")[0];
  }
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
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true, timezone: true },
  });

  const summary = {
    totalSubs: subs.length,
    sent: 0,
    removed: 0,
    skippedNotEkadashi: 0,
    skippedAlreadyDone: 0,
  };

  // De-dupe across multiple devices for the same user.
  const seen = new Set<string>();

  for (const sub of subs) {
    if (seen.has(sub.userId)) continue;
    seen.add(sub.userId);

    const tz = sub.timezone || FALLBACK_TIMEZONE;
    const localDate = localDateIn(tz, now);
    if (!isEkadashi(localDate)) {
      summary.skippedNotEkadashi++;
      continue;
    }

    const localDateAsUtc = new Date(`${localDate}T00:00:00Z`);
    const completed = await prisma.questCompletion.count({
      where: {
        userId: sub.userId,
        questId: "ekadashi-fast",
        date: localDateAsUtc,
      },
    });
    if (completed > 0) {
      summary.skippedAlreadyDone++;
      continue;
    }

    const result = await sendPushToUser(sub.userId, EKADASHI_PAYLOAD);
    summary.sent += result.sent;
    summary.removed += result.removed;
  }

  return NextResponse.json({ ok: true, ...summary });
}
