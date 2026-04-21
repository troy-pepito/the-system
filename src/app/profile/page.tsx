"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import StatRadar from "@/components/StatRadar";
import Heatmap from "@/components/Heatmap";
import HunterCard from "@/components/HunterCard";
import { ACHIEVEMENTS, rarityStyle } from "@/lib/achievements";
import {
  getProfilePageData,
  type ProfilePageData,
} from "@/app/actions/achievements";
import { STATS_UPDATED_EVENT } from "@/lib/player";

let profileCache: ProfilePageData | null = null;

type Range = "week" | "month" | "all";

export default function ProfilePage() {
  const [data, setData] = useState<ProfilePageData | null>(profileCache);
  const [range, setRange] = useState<Range>("all");

  useEffect(() => {
    const load = () => {
      getProfilePageData()
        .then((d) => {
          profileCache = d;
          setData(d);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener(STATS_UPDATED_EVENT, load);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, load);
  }, []);

  if (!data) return <main className="min-h-screen bg-slate-950 p-4 sm:p-8" />;

  const { stats, unlocked } = data;
  const unlockedMap = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlocked.length;
  const completion = Math.round((unlockedCount / totalCount) * 100);

  const windowed =
    range === "week"
      ? stats.windows.week
      : range === "month"
        ? stats.windows.month
        : {
            questTotal: stats.questTotal,
            workoutTotal: stats.workoutTotal,
            exposureTotal: stats.exposureTotal,
            perfectQuestDays: stats.perfectQuestDays,
          };
  const rangeLabel =
    range === "week" ? "Past 7 Days" : range === "month" ? "Past 30 Days" : "Lifetime";

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Hunter Profile
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <HunterCard level={stats.level} />

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
              Record — {rangeLabel}
            </p>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatLine label="Active Dungeons" value={stats.activeRunCount} />
            <StatLine label="Dungeons Cleared" value={stats.completedRunCount} />
            <StatLine label="Workouts Logged" value={windowed.workoutTotal} />
            <StatLine label="Exposures Logged" value={windowed.exposureTotal} />
            <StatLine label="Quests Completed" value={windowed.questTotal} />
            <StatLine label="Perfect Days" value={windowed.perfectQuestDays} />
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Dimensions
          </p>
          <StatRadar values={stats.dimensions} />
          <p className="text-[10px] text-slate-500 text-center mt-3 tracking-wider">
            Lifetime quest rewards across the five domains.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Activity — Last 8 Weeks
          </p>
          <Heatmap activity={data.heatmap} />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
              Trophies
            </p>
            <p className="text-xs text-slate-400">
              <span className="text-amber-300 font-bold">{unlockedCount}</span>
              <span className="text-slate-600"> / {totalCount}</span>
              <span className="text-slate-500 ml-2">({completion}%)</span>
            </p>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              style={{ width: `${completion}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((def) => {
              const unlockedAt = unlockedMap.get(def.id);
              const style = rarityStyle(def.rarity);
              const isUnlocked = !!unlockedAt;
              return (
                <div
                  key={def.id}
                  className={`relative border rounded-lg p-3 transition-all ${
                    isUnlocked
                      ? `${style.bg} ${style.border} ${style.glow}`
                      : "bg-slate-900/50 border-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xl font-bold flex-shrink-0 w-9 h-9 flex items-center justify-center border rounded ${
                        isUnlocked
                          ? `${style.text} ${style.border} ${style.bg} ${style.glow}`
                          : "text-slate-700 border-slate-800 bg-slate-900"
                      }`}
                    >
                      {isUnlocked ? def.icon : "?"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold uppercase tracking-wider truncate ${
                          isUnlocked ? style.text : "text-slate-600"
                        }`}
                      >
                        {isUnlocked ? def.name : "???"}
                      </p>
                      <p
                        className={`text-[10px] leading-snug mt-0.5 ${
                          isUnlocked ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        {def.description}
                      </p>
                      <p
                        className={`text-[9px] uppercase tracking-widest mt-1 ${
                          isUnlocked ? style.text : "text-slate-700"
                        }`}
                      >
                        {style.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </main>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-b border-slate-800 py-1.5">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm text-cyan-300 font-bold">{value}</span>
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  const options: { id: Range; label: string }[] = [
    { id: "week", label: "7D" },
    { id: "month", label: "30D" },
    { id: "all", label: "ALL" },
  ];
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-md">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`px-3 py-1 text-[10px] tracking-[0.25em] font-bold rounded transition-all ${
              active
                ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                : "text-slate-500 border border-transparent hover:text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}