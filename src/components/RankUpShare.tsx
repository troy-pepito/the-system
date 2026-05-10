"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { RANK_UP_EVENT } from "@/lib/player";
import {
  RANK_UP_SHARE_EVENT,
  type RankUpSharePair,
} from "@/lib/rankUpShareEvent";

// Celebration overlay (RankUpCelebration) fires ~700ms after RANK_UP
// and lingers up to 5s before auto-dismissing. Slip the share prompt
// in just after that ceremony settles so it doesn't compete for the
// player's attention while the rank letter is on screen.
const PRE_SHARE_DELAY_MS = 6000;

type RankPair = RankUpSharePair;

export default function RankUpShare() {
  const t = useTranslations("toasts");
  const { user } = useUser();
  const [pair, setPair] = useState<RankPair | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Wait for the rank-up glitch to clear before slipping the prompt in.
    const onRankUp = (e: Event) => {
      const detail = (e as CustomEvent<RankPair>).detail;
      if (!detail) return;
      timer = setTimeout(() => {
        setPair(detail);
      }, PRE_SHARE_DELAY_MS);
    };

    // Direct trigger for the dev test button — no delay.
    const onDirect = (e: Event) => {
      const detail = (e as CustomEvent<RankPair>).detail;
      if (!detail) return;
      setPair(detail);
    };

    window.addEventListener(RANK_UP_EVENT, onRankUp);
    window.addEventListener(RANK_UP_SHARE_EVENT, onDirect);
    return () => {
      window.removeEventListener(RANK_UP_EVENT, onRankUp);
      window.removeEventListener(RANK_UP_SHARE_EVENT, onDirect);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setPair(null);
  }

  async function handleShare() {
    if (!pair || !user || typeof window === "undefined") return;
    setWorking(true);
    const url = `${window.location.origin}/h/${user.id}`;
    const shareText = `Just hit Rank ${pair.to} on Shivaliva Leveling. Climbing the System one cleared day at a time.`;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: "Shivaliva Leveling: The System",
          text: shareText,
          url,
        });
      } catch {
        // user cancelled — fall through
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
      } catch {}
    }
    setWorking(false);
    setPair(null);
  }

  if (!pair) return null;

  return (
    <div className="fixed inset-x-3 bottom-4 sm:inset-auto sm:bottom-6 sm:right-6 z-[260] max-w-sm sm:max-w-md mx-auto sm:mx-0 pointer-events-none">
      <div className="relative bg-slate-950/95 border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.35),inset_0_0_20px_rgba(251,191,36,0.05)] p-4 pr-9 backdrop-blur pointer-events-auto">
        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300 pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300 pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismissShare")}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 text-sm"
        >
          ✕
        </button>

        <p className="text-[9px] tracking-[0.4em] uppercase text-amber-400/80 mb-1.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
          {t("ascension")}
        </p>
        <p className="font-display text-base font-bold text-amber-100 tracking-wider mb-1">
          {t("rankReached", { rank: pair.to })}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {t("shareAscension")}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={working}
            className="flex-1 px-3 py-2 bg-amber-500/20 border border-amber-400/60 text-amber-100 text-xs uppercase tracking-[0.3em] hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(251,191,36,0.4)]"
          >
            {working ? t("sharing") : t("share")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-2 border border-slate-700 text-slate-300 text-xs uppercase tracking-[0.3em] hover:bg-slate-800/60 transition-colors"
          >
            {t("later")}
          </button>
        </div>
      </div>
    </div>
  );
}
