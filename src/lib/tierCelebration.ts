"use client";
import { useEffect } from "react";
import {
  notifyCelebration,
  notifyReward,
  notifyStatsUpdated,
} from "@/lib/player";
import { TIER_BONUS_XP } from "@/lib/dungeons";

/**
 * Detects time-based tier crossings (cadence dungeons, where the tier
 * ladder advances passively with calendar days from startDate, not by
 * user action).
 *
 * On first detection per (dungeonId, startDate), the current tier is
 * silently recorded — no retro-celebration for tiers earned before
 * this feature shipped. Subsequent renders that show a higher tier
 * fire a 🏆 celebration toast + xpDelta exactly once per crossing.
 *
 * For action-based crossings (streak/timed cleared days, progressive
 * rungs cleared) use inline detection in the action handler instead —
 * those moments need synchronous feedback at the click site.
 */
export function useTierCrossingCelebration({
  dungeonId,
  dungeonName,
  startDate,
  tierIdx,
  tierRank,
}: {
  dungeonId: string;
  dungeonName: string;
  startDate: string | null;
  tierIdx: number;
  tierRank: string | null;
}) {
  useEffect(() => {
    if (tierIdx < 0 || !tierRank || typeof window === "undefined") return;

    const key = `tier-last-seen:${dungeonId}:${startDate ?? "x"}`;
    let lastSeen: number | null = null;
    try {
      const raw = localStorage.getItem(key);
      lastSeen = raw === null ? null : parseInt(raw, 10);
    } catch {
      return;
    }

    // First detection — silent catch-up so existing high-tier players
    // don't get a wave of retro celebrations on this feature's first
    // load. Future tier crossings fire normally.
    if (lastSeen === null || Number.isNaN(lastSeen)) {
      try {
        localStorage.setItem(key, String(tierIdx));
      } catch {}
      return;
    }

    if (tierIdx <= lastSeen) return;

    try {
      localStorage.setItem(key, String(tierIdx));
    } catch {}

    const bonus = TIER_BONUS_XP[tierIdx] ?? 0;
    const timer = setTimeout(() => {
      notifyReward({
        xp: bonus,
        sourceKey: "dungeonRun.tierBonusSource",
        sourceValues: { rank: tierRank, dungeonId },
      });
      notifyStatsUpdated({ xpDelta: bonus });
      notifyCelebration({
        titleKey: "celebration.tierCrossingTitle",
        titleValues: { rank: tierRank },
        subtitleKey: "celebration.tierCrossingSubtitle",
        subtitleValues: { dungeon: dungeonName },
        xp: bonus,
        tone: "violet",
      });
    }, 1100);
    return () => clearTimeout(timer);
  }, [dungeonId, dungeonName, startDate, tierIdx, tierRank]);
}
