import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  if (initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
    },
  });
  initialized = true;
}

export type AnalyticsEvent =
  | "awakening_complete"
  | "dungeon_entered"
  | "quest_completed"
  | "relapse"
  | "day_confirmed_cleared"
  | "day_confirmed_relapsed"
  | "perfect_day_bonus"
  | "cadence_full_clear_bonus"
  // Once-per-account funnel events — fired the first time a hunter
  // ticks a quest or enters a dungeon after awakening. Gated by
  // localStorage at the call sites so a re-tick after refresh doesn't
  // double-fire. Used to measure post-awakening drop-off.
  | "first_quest_completed"
  | "first_dungeon_entered";

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

export function capturePageView() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.capture("$pageview");
}