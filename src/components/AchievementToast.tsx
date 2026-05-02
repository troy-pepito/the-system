"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { STATS_UPDATED_EVENT } from "@/lib/player";
import { evaluateAchievements } from "@/app/actions/achievements";
import {
  getAchievement,
  rarityStyle,
  resolveAchievementLabels,
} from "@/lib/achievements";

interface QueuedToast {
  key: number;
  id: string;
}

export default function AchievementToast() {
  const t = useTranslations("toasts");
  const tAchievements = useTranslations("achievements");
  const tDungeons = useTranslations("dungeons");
  const tRungs = useTranslations("rungs");
  const tRarity = useTranslations("rarityLabels");
  const [queue, setQueue] = useState<QueuedToast[]>([]);

  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      try {
        const newly = await evaluateAchievements();
        if (!mounted || newly.length === 0) return;
        setQueue((prev) => [
          ...prev,
          ...newly.map((id) => ({ key: Date.now() + Math.random(), id })),
        ]);
      } catch {
        // swallow — achievement errors must not break the app
      }
    };

    runCheck();
    window.addEventListener(STATS_UPDATED_EVENT, runCheck);
    return () => {
      mounted = false;
      window.removeEventListener(STATS_UPDATED_EVENT, runCheck);
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, 5000);
    return () => clearTimeout(t);
  }, [queue]);

  if (queue.length === 0) return null;
  const current = queue[0];
  const def = getAchievement(current.id);
  if (!def) return null;
  const style = rarityStyle(def.rarity);
  const labels = resolveAchievementLabels(
    current.id,
    tAchievements,
    tDungeons,
    tRungs,
    { name: def.name, description: def.description }
  );
  const rarityLabel = tRarity(def.rarity);

  return (
    <div className="fixed top-20 right-4 z-[100] pointer-events-none animate-[toast-slide_0.5s_ease-out]">
      <div
        className={`${style.bg} ${style.border} border-2 rounded-lg px-5 py-4 min-w-[280px] max-w-[360px] backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)] ${style.glow}`}
      >
        <p className={`text-[10px] tracking-[0.3em] uppercase ${style.text} mb-1`}>
          {t("achievementUnlocked")}
        </p>
        <div className="flex items-center gap-3">
          <span
            className={`text-3xl font-bold ${style.text} ${style.glow} flex-shrink-0 w-12 h-12 flex items-center justify-center border-2 ${style.border} rounded-lg ${style.bg}`}
          >
            {def.icon}
          </span>
          <div className="flex-1">
            <p className={`text-sm font-bold uppercase tracking-wider ${style.text} ${style.glow}`}>
              {labels.name}
            </p>
            <p className="text-xs text-slate-300 leading-snug mt-0.5">
              {labels.description}
            </p>
            <p className={`text-[9px] uppercase tracking-widest mt-1 ${style.text}`}>
              {rarityLabel}
            </p>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes toast-slide {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}