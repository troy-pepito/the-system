"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Paywall from "@/components/Paywall";
import WhatsNewBadge from "@/components/WhatsNewBadge";
import { isPricingEnabled, isUserPro } from "@/lib/pricing";
import { getRankStyle } from "@/lib/rankStyle";
import {
  STATS_UPDATED_EVENT,
  getLevelFromXp,
  getRank,
  hasPendingMutations,
  notifyRankUp,
  notifyLevelUp,
} from "@/lib/player";
import { useTweenNumber } from "@/lib/useTweenNumber";
import {
  getProfileStats,
  getUnclaimedTrophyCount,
} from "@/app/actions/achievements";
import { readCache, writeCache } from "@/lib/offlineCache";

const TOTAL_XP_CACHE_KEY = "totalXp";

export default function Navbar() {
  // Initialize 0 on both server and client so the SSR'd HTML matches
  // the first client render. Cache hydration happens in the useEffect.
  const [totalXp, setTotalXp] = useState<number>(0);
  const [unclaimedTrophyCount, setUnclaimedTrophyCount] = useState<number>(0);
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navLink = (href: string, label: string, badgeCount?: number) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`relative transition-colors ${
          isActive
            ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
            : "text-slate-400 hover:text-cyan-300"
        }`}
      >
        {label}
        {!!badgeCount && badgeCount > 0 && (
          <span
            aria-label={`${badgeCount} unclaimed`}
            className="absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center bg-amber-400 text-slate-950 text-[8px] font-bold rounded-full shadow-[0_0_6px_rgba(251,191,36,0.7)]"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  useEffect(() => {
    // Hydrate XP from cache after mount so the bar fills in instantly,
    // then fetch fresh from the server.
    const cached = readCache<number>(TOTAL_XP_CACHE_KEY);
    if (typeof cached === "number") setTotalXp(cached);

    const recompute = async () => {
      try {
        const stats = await getProfileStats();
        if (hasPendingMutations()) return;
        writeCache(TOTAL_XP_CACHE_KEY, stats.totalXp);
        setTotalXp(stats.totalXp);
      } catch {}
      try {
        // Trophy count is cheap (single COUNT query, server-cached) so
        // pulling it on the same recompute trigger is fine. Fires
        // alongside totalXp on every STATS_UPDATED_EVENT.
        const count = await getUnclaimedTrophyCount();
        setUnclaimedTrophyCount(count);
      } catch {}
    };
    const onEvent = (e: Event) => {
      const delta = (e as CustomEvent<{ xpDelta?: number }>).detail?.xpDelta;
      if (typeof delta === "number") {
        setTotalXp((prev) => {
          const next = Math.max(0, prev + delta);
          writeCache(TOTAL_XP_CACHE_KEY, next);
          return next;
        });
        return;
      }
      recompute();
    };
    recompute();
    window.addEventListener(STATS_UPDATED_EVENT, onEvent);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, onEvent);
  }, []);

  const tweenedTotal = useTweenNumber(totalXp, 600);
  const { level, currentXp, xpToNext } = getLevelFromXp(
    Math.round(tweenedTotal)
  );
  const rank = getRank(level);
  const percent = Math.round((currentXp / xpToNext) * 100);

  // Change detection runs against the *raw* totalXp, not the tweened
  // display value. Without this, the boot-time tween from 0 → cached
  // scrubs through every intermediate level and fires a level-up
  // event for each frame on first load.
  const rawLevel = getLevelFromXp(totalXp).level;
  const rawRank = getRank(rawLevel);
  const prevRankRef = useRef<string | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (totalXp <= 0) return;
    const prevRank = prevRankRef.current;
    const prevLevel = prevLevelRef.current;
    const rankChanged = !!(prevRank && prevRank !== rawRank);
    const levelChanged = !!(prevLevel && prevLevel !== rawLevel);
    if (rankChanged) {
      notifyRankUp({ from: prevRank!, to: rawRank });
    }
    if (levelChanged) {
      notifyLevelUp({
        from: prevLevel!,
        to: rawLevel,
        alsoRankedUp: rankChanged,
      });
    }
    prevRankRef.current = rawRank;
    prevLevelRef.current = rawLevel;
  }, [rawRank, rawLevel, totalXp]);

  const { user } = useUser();
  const pricingOn = isPricingEnabled();
  const showUpgrade = pricingOn && !isUserPro(user);
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="text-cyan-400 font-bold tracking-[0.2em] sm:tracking-[0.25em] text-xs sm:text-sm uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          >
            The System
          </Link>
          <div className="hidden sm:flex gap-5 text-[10px] uppercase tracking-widest">
            {navLink("/", t("status"))}
            {navLink("/portals", t("portals"))}
            {navLink("/feed", t("feed"))}
            {navLink("/profile", t("profile"), unclaimedTrophyCount)}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] uppercase tracking-widest">
            {showUpgrade && (
              <button
                onClick={() => setPaywallOpen(true)}
                className="px-2 py-0.5 border border-amber-400/50 text-amber-300 hover:bg-amber-500/10 transition-colors rounded-sm tracking-widest drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
              >
                Pro
              </button>
            )}
            <WhatsNewBadge />
            <Link
              href="/settings"
              aria-label="Settings"
              className={`flex items-center justify-center w-6 h-6 rounded-sm transition-colors ${
                pathname.startsWith("/settings")
                  ? "text-cyan-300"
                  : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "w-6 h-6 ring-1 ring-cyan-500/40 hover:ring-cyan-400 transition-all",
                },
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p
            className={`text-[10px] font-bold whitespace-nowrap ${
              getRankStyle(rank).text
            } ${getRankStyle(rank).textClass} ${getRankStyle(rank).glow}`}
          >
            {t("levelLabel", { level })}
          </p>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.6)]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 whitespace-nowrap">
            {currentXp} / {xpToNext} XP
          </p>
        </div>
        <div className="sm:hidden flex justify-center gap-5 mt-3 pt-2 border-t border-cyan-500/10 text-[10px] uppercase tracking-widest">
          {navLink("/", t("status"))}
          {navLink("/portals", t("portals"))}
          {navLink("/feed", t("feed"))}
          {navLink("/profile", t("profile"), unclaimedTrophyCount)}
        </div>
      </div>
      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </nav>
  );
}