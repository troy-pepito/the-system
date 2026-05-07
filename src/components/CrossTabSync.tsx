"use client";
import { useEffect } from "react";
import { notifyStatsUpdated } from "@/lib/player";

const CACHE_KEY_PREFIX = "shivaliva:cache:";
const QUEUE_KEY = "shivaliva:queue";
const POLL_INTERVAL_MS = 60_000;

/**
 * Closes two of the "feels stale" gaps without any new infrastructure:
 *
 * 1. Cross-tab same-device sync. When tab A writes to localStorage
 *    (cache update from a quest toggle, queue drain, etc.) the browser
 *    fires `storage` events on every OTHER same-origin window. We
 *    listen for our own cache/queue keys and re-broadcast as the
 *    in-tab STATS_UPDATED_EVENT, so existing refetch wiring picks it
 *    up. No-op in the originating tab — `storage` only fires elsewhere.
 *
 * 2. Long-idle tabs that never lose focus. A 60s soft poll triggers a
 *    refetch when the tab is visible and online. Skipped while hidden
 *    or offline so we don't waste battery / fail loudly while
 *    disconnected.
 *
 * Mounted once at the layout level (signed-in only — there's nothing
 * to refetch when signed out).
 */
export default function CrossTabSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (e.key.startsWith(CACHE_KEY_PREFIX) || e.key === QUEUE_KEY) {
        notifyStatsUpdated();
      }
    }

    function tickPoll() {
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) return;
      notifyStatsUpdated();
    }

    window.addEventListener("storage", onStorage);
    const interval = setInterval(tickPoll, POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return null;
}
