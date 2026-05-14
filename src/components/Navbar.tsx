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
import {
  getPendingJoinRequestCount,
  getLatestGuildEventTimestamp,
} from "@/app/actions/guilds";

const GUILD_FEED_LAST_SEEN_KEY = "system:guild-feed-last-seen";
import { readCache, writeCache } from "@/lib/offlineCache";

const TOTAL_XP_CACHE_KEY = "totalXp";

export default function Navbar() {
  // Initialize 0 on both server and client so the SSR'd HTML matches
  // the first client render. Cache hydration happens in the useEffect.
  const [totalXp, setTotalXp] = useState<number>(0);
  const [unclaimedTrophyCount, setUnclaimedTrophyCount] = useState<number>(0);
  const [pendingGuildCount, setPendingGuildCount] = useState<number>(0);
  const [hasNewGuildFeed, setHasNewGuildFeed] = useState<boolean>(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  /**
   * Navbar item: icon + label, with active-state glow + an optional
   * amber count badge (used by Profile for unclaimed trophies). The
   * desktop layout puts icon and label side-by-side; the mobile
   * bottom row stacks icon over a smaller label.
   */
  const navItem = (
    href: string,
    label: string,
    icon: React.ReactNode,
    options?: {
      badgeCount?: number;
      layout?: "row" | "stack";
      /** Independent of badgeCount. Small cyan pulse at the top-left
       *  of the icon, signals "new activity" without a specific count.
       *  Used by Guilds for unread feed posts. */
      showDot?: boolean;
    }
  ) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    const layout = options?.layout ?? "row";
    const badgeCount = options?.badgeCount;
    const showDot = options?.showDot;
    return (
      <Link
        href={href}
        className={`relative inline-flex transition-colors ${
          layout === "stack"
            ? "flex-col items-center gap-0.5"
            : "items-center gap-1.5"
        } ${
          isActive
            ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
            : "text-slate-300 hover:text-cyan-300"
        }`}
      >
        <span className="relative inline-flex">
          {icon}
          {!!badgeCount && badgeCount > 0 && (
            <span
              aria-label={`${badgeCount} unclaimed`}
              className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 flex items-center justify-center bg-amber-400 text-slate-950 text-[8px] font-bold rounded-full shadow-[0_0_6px_rgba(251,191,36,0.7)]"
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
          {showDot && (
            <span
              aria-label="New activity"
              className="absolute -top-1 -left-1.5 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse"
            />
          )}
        </span>
        <span className={layout === "stack" ? "text-[8px]" : ""}>
          {label}
        </span>
      </Link>
    );
  };

  // SVG props are kept tiny and consistent, 18px in the desktop row,
  // 20px in the mobile stack via classes on the wrapper. Stroke-only
  // shapes match the existing settings-gear icon's vibe.
  const iconClass = "w-[18px] h-[18px]";
  const statusIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass}
      aria-hidden
    >
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
  const guildsIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass}
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
  const boardIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass}
      aria-hidden
    >
      {/* Stepped bar chart, short, medium, tall, leans into the
          ranking metaphor rather than the trophy/printer the previous
          icon was reading as. */}
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
  const profileIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass}
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );

  useEffect(() => {
    // Hydrate XP from cache after mount so the bar fills in instantly,
    // then fetch fresh from the server.
    const cached = readCache<number>(TOTAL_XP_CACHE_KEY);
    if (typeof cached === "number") setTotalXp(cached);

    // Split the recompute into "heavy" (XP via getProfileStats) and
    // "cheap" (the two badge COUNT queries). Lets the xpDelta fast-path
    // still refresh the badges without re-fetching XP, so claiming a
    // trophy or approving a join request decrements the bubble within
    // the same render cycle instead of waiting for the next no-delta
    // event (which was the "bubble takes forever to update" bug).
    const refreshBadges = async () => {
      try {
        const count = await getUnclaimedTrophyCount();
        setUnclaimedTrophyCount(count);
      } catch {}
      try {
        const count = await getPendingJoinRequestCount();
        setPendingGuildCount(count);
      } catch {}
      try {
        const latest = await getLatestGuildEventTimestamp();
        if (!latest) {
          setHasNewGuildFeed(false);
        } else {
          let lastSeen = "";
          try {
            lastSeen = localStorage.getItem(GUILD_FEED_LAST_SEEN_KEY) ?? "";
          } catch {}
          setHasNewGuildFeed(latest > lastSeen);
        }
      } catch {}
    };
    const recompute = async () => {
      try {
        const stats = await getProfileStats();
        if (hasPendingMutations()) return;
        writeCache(TOTAL_XP_CACHE_KEY, stats.totalXp);
        setTotalXp(stats.totalXp);
      } catch {}
      await refreshBadges();
    };
    const onEvent = (e: Event) => {
      const delta = (e as CustomEvent<{ xpDelta?: number }>).detail?.xpDelta;
      if (typeof delta === "number") {
        setTotalXp((prev) => {
          const next = Math.max(0, prev + delta);
          writeCache(TOTAL_XP_CACHE_KEY, next);
          return next;
        });
        // Badge counts can change on the same event (claiming a trophy
        // fires xpDelta and also decrements unclaimedTrophyCount), so
        // refresh them alongside the optimistic XP bump.
        refreshBadges();
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
            {navItem("/", t("status"), statusIcon)}
            {navItem("/guilds", t("guilds"), guildsIcon, {
              badgeCount: pendingGuildCount,
              showDot: hasNewGuildFeed,
            })}
            {navItem("/leaderboard", t("board"), boardIcon)}
            {navItem("/profile", t("profile"), profileIcon, {
              badgeCount: unclaimedTrophyCount,
            })}
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
                  : "text-slate-300 hover:text-cyan-300"
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
        <div className="sm:hidden flex justify-around gap-2 mt-3 pt-2 border-t border-cyan-500/10 text-[10px] uppercase tracking-widest">
          {navItem("/", t("status"), statusIcon, { layout: "stack" })}
          {navItem("/guilds", t("guilds"), guildsIcon, {
            layout: "stack",
            badgeCount: pendingGuildCount,
            showDot: hasNewGuildFeed,
          })}
          {navItem("/leaderboard", t("board"), boardIcon, { layout: "stack" })}
          {navItem("/profile", t("profile"), profileIcon, {
            layout: "stack",
            badgeCount: unclaimedTrophyCount,
          })}
        </div>
      </div>
      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </nav>
  );
}