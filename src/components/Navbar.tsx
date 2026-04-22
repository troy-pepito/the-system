"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  STATS_UPDATED_EVENT,
  XP_PER_STREAK_DAY,
  XP_PER_WORKOUT,
  XP_PER_EXPOSURE,
  XP_PER_COMPLETION,
  computeStreakDays,
  getLevelFromXp,
  getRank,
  hasPendingMutations,
} from "@/lib/player";
import { getAllActiveRuns, getBonusXp } from "@/app/actions/dungeons";
import { getLifetimeRewards } from "@/app/actions/quests";

export default function Navbar() {
  const [totalXp, setTotalXp] = useState(0);
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`transition-colors ${
          isActive
            ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
            : "text-slate-400 hover:text-cyan-300"
        }`}
      >
        {label}
      </Link>
    );
  };

  useEffect(() => {
    const recompute = async () => {
      const [runs, rewards, bonus] = await Promise.all([
        getAllActiveRuns(),
        getLifetimeRewards(),
        getBonusXp(),
      ]);
      if (hasPendingMutations()) return;
      const totalStreakDays = runs.reduce(
        (sum, r) => sum + computeStreakDays(r.startDate),
        0
      );
      const bonusXp =
        bonus.workouts * XP_PER_WORKOUT +
        bonus.exposures * XP_PER_EXPOSURE +
        bonus.completions * XP_PER_COMPLETION +
        bonus.bankedStreakDays * XP_PER_STREAK_DAY;
      setTotalXp(totalStreakDays * XP_PER_STREAK_DAY + rewards.xp + bonusXp);
    };
    const onEvent = (e: Event) => {
      const delta = (e as CustomEvent<{ xpDelta?: number }>).detail?.xpDelta;
      if (typeof delta === "number") {
        setTotalXp((prev) => Math.max(0, prev + delta));
        return;
      }
      recompute();
    };
    recompute();
    window.addEventListener(STATS_UPDATED_EVENT, onEvent);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, onEvent);
  }, []);

  const { level, currentXp, xpToNext } = getLevelFromXp(totalXp);
  const rank = getRank(level);
  const percent = Math.round((currentXp / xpToNext) * 100);

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="text-cyan-400 font-bold tracking-[0.2em] sm:tracking-[0.25em] text-xs sm:text-sm uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          >
            Shivaliva
          </Link>
          <div className="hidden sm:flex gap-5 text-[10px] uppercase tracking-widest">
            {navLink("/", "Status")}
            {navLink("/portals", "Portals")}
            {navLink("/profile", "Profile")}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] uppercase tracking-widest">
            <span className="text-amber-400">Rank {rank}</span>
            <span className="text-emerald-400">Lv {level}</span>
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
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(34,211,238,0.6)]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 whitespace-nowrap">
            {currentXp} / {xpToNext} XP
          </p>
        </div>
        <div className="sm:hidden flex justify-center gap-6 mt-3 pt-2 border-t border-cyan-500/10 text-[10px] uppercase tracking-widest">
          {navLink("/", "Status")}
          {navLink("/portals", "Portals")}
          {navLink("/profile", "Profile")}
        </div>
      </div>
    </nav>
  );
}