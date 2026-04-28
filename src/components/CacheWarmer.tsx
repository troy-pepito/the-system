"use client";
import { useEffect } from "react";
import { readCache, writeCache } from "@/lib/offlineCache";
import { dashboardCacheKey } from "@/lib/dashboardCacheOps";
import { useOnline } from "@/lib/offline";
import {
  getAllActiveRuns,
  getDashboardData,
  getJournalEntries,
} from "@/app/actions/dungeons";
import { getProfilePageData } from "@/app/actions/achievements";
import { todayLocalISO } from "@/lib/quests";

export default function CacheWarmer() {
  const online = useOnline();

  useEffect(() => {
    if (!online) return;

    const today = todayLocalISO();
    const dashKey = dashboardCacheKey(today);
    if (!readCache(dashKey)) {
      getDashboardData(today)
        .then((d) => writeCache(dashKey, d))
        .catch(() => {});
    }
    if (!readCache("profile")) {
      getProfilePageData()
        .then((d) => writeCache("profile", d))
        .catch(() => {});
    }
    if (!readCache("activeRuns")) {
      getAllActiveRuns()
        .then((d) => writeCache("activeRuns", d))
        .catch(() => {});
    }
    if (!readCache("journal")) {
      getJournalEntries()
        .then((d) => writeCache("journal", d))
        .catch(() => {});
    }
  }, [online]);

  return null;
}