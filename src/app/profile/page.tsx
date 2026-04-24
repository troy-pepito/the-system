"use client";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import StatRadar from "@/components/StatRadar";
import Heatmap from "@/components/Heatmap";
import HunterCard from "@/components/HunterCard";
import {
  ACHIEVEMENTS,
  achievementCategory,
  isComboAchievementId,
  rarityStyle,
  type AchievementDef,
} from "@/lib/achievements";
import { DUNGEONS } from "@/lib/dungeons";
import {
  getProfilePageData,
  type ProfilePageData,
} from "@/app/actions/achievements";
import {
  getJournalEntries,
  type JournalEntry,
} from "@/app/actions/dungeons";
import { getDungeon } from "@/lib/dungeons";
import { STATS_UPDATED_EVENT } from "@/lib/player";
import {
  ATMOSPHERE_EVENT,
  getAtmosphereEnabled,
  setAtmosphereEnabled,
} from "@/lib/preferences";
import { readCache, writeCache } from "@/lib/offlineCache";

const PROFILE_CACHE_KEY = "profile";
const JOURNAL_CACHE_KEY = "journal";

type Range = "week" | "month" | "all";

export default function ProfilePage() {
  const [data, setData] = useState<ProfilePageData | null>(() =>
    typeof window === "undefined"
      ? null
      : readCache<ProfilePageData>(PROFILE_CACHE_KEY)
  );
  const [journal, setJournal] = useState<JournalEntry[]>(() =>
    typeof window === "undefined"
      ? []
      : readCache<JournalEntry[]>(JOURNAL_CACHE_KEY) ?? []
  );
  const [range, setRange] = useState<Range>("all");

  useEffect(() => {
    const load = () => {
      getProfilePageData()
        .then((d) => {
          writeCache(PROFILE_CACHE_KEY, d);
          setData(d);
        })
        .catch(() => {});
      getJournalEntries()
        .then((j) => {
          writeCache(JOURNAL_CACHE_KEY, j);
          setJournal(j);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener(STATS_UPDATED_EVENT, load);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, load);
  }, []);

  if (!data) return <main className="min-h-screen bg-slate-950 p-4 sm:p-8" />;

  const { stats, unlocked } = data;
  const trophyUnlocked = unlocked.filter((u) => !isComboAchievementId(u.id));
  const unlockedMap = new Map(trophyUnlocked.map((u) => [u.id, u.unlockedAt]));
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = trophyUnlocked.length;
  const completion = Math.round((unlockedCount / totalCount) * 100);

  const foundations: AchievementDef[] = [];
  const progression: AchievementDef[] = [];
  const training: AchievementDef[] = [];
  const byDungeon = new Map<string, AchievementDef[]>();
  for (const def of ACHIEVEMENTS) {
    const cat = achievementCategory(def.id);
    if (cat.category === "foundations") foundations.push(def);
    else if (cat.category === "progression") progression.push(def);
    else if (cat.category === "training") training.push(def);
    else if (cat.category === "dungeon" && cat.dungeonId) {
      const arr = byDungeon.get(cat.dungeonId) ?? [];
      arr.push(def);
      byDungeon.set(cat.dungeonId, arr);
    }
  }

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

        <HunterCard totalXp={stats.totalXp} scattered={stats.scattered} />

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
            Earned from daily quests and dungeon ranks cleared.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Activity — Last 8 Weeks
          </p>
          <Heatmap activity={data.heatmap} />
        </Card>

        <JournalSection entries={journal} />

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

          <TrophySection
            label="Foundations"
            defs={foundations}
            unlockedMap={unlockedMap}
          />
          <TrophySection
            label="Hunter Progression"
            defs={progression}
            unlockedMap={unlockedMap}
          />
          <TrophySection
            label="Training"
            defs={training}
            unlockedMap={unlockedMap}
          />
          <div className="mt-8">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-cyan-500/40" />
              <p className="font-display text-[10px] tracking-[0.4em] uppercase text-cyan-300/80 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                Dungeon Mastery
              </p>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-cyan-500/40" />
            </div>
            <div className="space-y-5">
              {DUNGEONS.map((d) => {
                const defs = byDungeon.get(d.id);
                if (!defs || defs.length === 0) return null;
                return (
                  <TrophySection
                    key={d.id}
                    label={d.name}
                    defs={defs}
                    unlockedMap={unlockedMap}
                    nested
                  />
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Settings
          </p>
          <AtmosphereToggle />
        </Card>
      </div>
    </main>
  );
}

function AtmosphereToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getAtmosphereEnabled());
    const handler = () => setEnabled(getAtmosphereEnabled());
    window.addEventListener(ATMOSPHERE_EVENT, handler);
    return () => window.removeEventListener(ATMOSPHERE_EVENT, handler);
  }, []);

  function toggle() {
    setAtmosphereEnabled(!enabled);
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 uppercase tracking-wider">
          Atmosphere
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          Film grain, scanlines, and vignette. Disable for a cleaner, flatter view.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className={`shrink-0 relative w-14 h-7 rounded-full border transition-colors ${
          enabled
            ? "bg-cyan-500/25 border-cyan-400/60 shadow-[0_0_14px_rgba(34,211,238,0.4)]"
            : "bg-slate-900 border-slate-700"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all duration-200 ease-out ${
            enabled
              ? "left-[31px] bg-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              : "left-[3px] bg-slate-400"
          }`}
        />
      </button>
    </div>
  );
}

function TrophySection({
  label,
  defs,
  unlockedMap,
  nested,
}: {
  label: string;
  defs: AchievementDef[];
  unlockedMap: Map<string, unknown>;
  nested?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (defs.length === 0) return null;
  const unlockedHere = defs.filter((d) => unlockedMap.has(d.id)).length;
  return (
    <div className={nested ? "" : "mt-6 first:mt-0"}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`w-full flex items-center justify-between gap-3 py-2 rounded transition-colors hover:text-cyan-200 ${
          expanded ? "mb-3" : "mb-0"
        }`}
      >
        <p
          className={`tracking-[0.3em] uppercase text-left ${
            nested ? "text-[10px] text-cyan-400/70" : "text-[10px] text-slate-400"
          }`}
        >
          {label}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[10px] text-slate-500 font-mono">
            <span className="text-amber-300">{unlockedHere}</span>
            <span className="text-slate-700"> / {defs.length}</span>
          </p>
          <span
            className={`text-[10px] text-slate-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </div>
      </button>
      {expanded && (
      <div className="grid grid-cols-2 gap-3">
        {defs.map((def) => {
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
                    className={`text-[11px] leading-relaxed mt-1 ${
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
      )}
    </div>
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

function eventLabel(type: string): string {
  if (type === "relapse") return "Relapse";
  if (type === "completed") return "Completed";
  return type.replace(/-/g, " ");
}

function eventTone(type: string): string {
  if (type === "relapse") return "text-red-300 border-red-500/40 bg-red-500/10";
  if (type === "completed")
    return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  return "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";
}

function JournalSection({ entries }: { entries: JournalEntry[] }) {
  return (
    <Card className="p-6">
      <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
        Journal
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 leading-relaxed">
          No entries yet. When you relapse, log a coffee, or mark an exposure,
          you'll be asked if you want to write a note — skip or save, your call.
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => {
            const dungeon = getDungeon(e.dungeonId);
            return (
              <li
                key={e.id}
                className="border-l-2 border-cyan-500/30 pl-3 py-0.5"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-slate-500 font-mono">
                    {e.date}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase text-cyan-300/80">
                    {dungeon?.name ?? e.dungeonId}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm ${eventTone(e.type)}`}
                  >
                    {eventLabel(e.type)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {e.note}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
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