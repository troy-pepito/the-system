"use client";
import { useEffect } from "react";
import { readCache, writeCache } from "@/lib/offlineCache";
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

    if (!readCache("dashboard")) {
      getDashboardData(todayLocalISO())
        .then((d) => writeCache("dashboard", d))
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