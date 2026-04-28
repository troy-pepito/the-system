import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { isEkadashi } from "@/lib/quests";

export const dynamic = "force-dynamic";

const TARGET_LOCAL_HOUR = 11; // ~11 AM in user's local time, before lunch.
const FALLBACK_TIMEZONE = "Asia/Dubai"; // Used when a sub has no tz recorded.

const EKADASHI_PAYLOAD: PushPayload = {
  title: "⚡ Ekadashi side quest unlocked",
  body: "Fast on cooked food until sundown. Tap to view the quest.",
  url: "/",
};

/**
 * Returns the current local hour in the given IANA timezone (0–23).
 * Falls back to UTC hour if the timezone string is invalid.
 */
function localHourIn(timezone: string, now: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const part = fmt
      .formatToParts(now)
      .find((p) => p.type === "hour");
    return part ? parseInt(part.value, 10) : now.getUTCHours();
  } catch {
    return now.getUTCHours();
  }
}

/**
 * Returns YYYY-MM-DD calendar date in the given timezone.
 */
function localDateIn(timezone: string, now: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(now); // en-CA returns YYYY-MM-DD
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

  // Fetch every push sub with its userId and tz. The same user can have
  // multiple subs (different devices) with potentially different tzs —
  // each is evaluated independently.
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true, timezone: true, endpoint: true },
  });

  const summary = {
    totalSubs: subs.length,
    sent: 0,
    removed: 0,
    skippedHour: 0,
    skippedNotEkadashi: 0,
    skippedAlreadyDone: 0,
  };

  // Group endpoints by (userId, localDate) to avoid double-pushing the
  // same user when they have multiple devices in the same tz.
  const seen = new Set<string>();

  for (const sub of subs) {
    const tz = sub.timezone || FALLBACK_TIMEZONE;
    const localHour = localHourIn(tz, now);
    if (localHour !== TARGET_LOCAL_HOUR) {
      summary.skippedHour++;
      continue;
    }

    const localDate = localDateIn(tz, now);
    if (!isEkadashi(localDate)) {
      summary.skippedNotEkadashi++;
      continue;
    }

    const key = `${sub.userId}:${localDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // If user already completed today's ekadashi, skip the push.
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
