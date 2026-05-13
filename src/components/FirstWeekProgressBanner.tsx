"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * Lightweight day-specific welcome banner shown on the dashboard at
 * milestone return days during a hunter's first week (Day 2 and Day 5).
 * Day 7 is intentionally NOT included here — it's the larger ceremony
 * handled by FirstWeekTrophy.
 *
 * The goal is positive feedback for returning. Bands of hunters get
 * a small "you came back" beat at day 2 (highest dropoff day) and a
 * "momentum" beat at day 5, which together flatten the week-one
 * retention curve at almost zero cost.
 *
 * Each milestone is shown at most once per hunter, tracked via
 * localStorage keys. The check is purely client-side so there's no
 * server cost; the message is informational only (no XP changes).
 */
const SHOWN_KEY_PREFIX = "system:first-week-day-shown:";
const MILESTONES: Record<number, { title: string; body: string }> = {
  2: {
    title: "[ DAY 2 ]",
    body: "You came back. Most don't make it past day one.",
  },
  5: {
    title: "[ DAY 5 ]",
    body: "Momentum is real. The dungeon learns your name.",
  },
};

function isShown(day: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SHOWN_KEY_PREFIX + day) === "1";
  } catch {
    return true;
  }
}

function markShown(day: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHOWN_KEY_PREFIX + day, "1");
  } catch {}
}

export default function FirstWeekProgressBanner() {
  const { user, isLoaded } = useUser();
  const [activeDay, setActiveDay] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.createdAt) return;

    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (MILESTONES[daysSinceSignup] && !isShown(daysSinceSignup)) {
      setActiveDay(daysSinceSignup);
    }
  }, [isLoaded, user]);

  if (activeDay === null) return null;

  const milestone = MILESTONES[activeDay];
  if (!milestone) return null;

  function dismiss() {
    if (activeDay !== null) markShown(activeDay);
    setActiveDay(null);
  }

  return (
    <div className="relative bg-slate-950/80 border border-emerald-400/40 shadow-[0_0_20px_rgba(52,211,153,0.2),inset_0_0_12px_rgba(52,211,153,0.05)] p-5">
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300 pointer-events-none" />

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-emerald-400/50 hover:text-emerald-300 text-sm leading-none w-6 h-6 flex items-center justify-center"
      >
        ×
      </button>

      <p className="text-[10px] tracking-[0.4em] uppercase text-emerald-400/80 mb-2">
        {milestone.title}
      </p>
      <p className="text-sm text-emerald-100 leading-relaxed pr-6">
        {milestone.body}
      </p>
    </div>
  );
}
