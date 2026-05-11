"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Card from "@/components/Card";
import StatRadar from "@/components/StatRadar";
import Heatmap from "@/components/Heatmap";
import HunterCard from "@/components/HunterCard";
import {
  ACHIEVEMENTS,
  achievementCategory,
  isComboAchievementId,
  rarityStyle,
  resolveAchievementLabels,
  TROPHY_XP_BY_RARITY,
  type AchievementDef,
} from "@/lib/achievements";
import { DUNGEONS } from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
import {
  claimAchievement,
  getProfilePageData,
  type ProfilePageData,
} from "@/app/actions/achievements";
import {
  getJournalEntries,
  type JournalEntry,
} from "@/app/actions/dungeons";
import JournalSection from "@/components/JournalSection";
import RecentGains from "@/components/RecentGains";
import FriendsSection from "@/components/FriendsSection";
import {
  STATS_UPDATED_EVENT,
  notifyReward,
  notifyStatsUpdated,
} from "@/lib/player";
import { readCache, writeCache } from "@/lib/offlineCache";

const PROFILE_CACHE_KEY = "profile";
const JOURNAL_CACHE_KEY = "journal";

type Range = "week" | "month" | "all";

export default function ProfilePage() {
  const tProfile = useTranslations("publicProfile");
  const tProfileOwn = useTranslations("profile");
  const tDungeons = useTranslations("dungeons");
  // Important: initialize to null/[] both server- and client-side so the
  // first render matches between SSR and hydration. Cache is read inside
  // useEffect AFTER the initial render commits.
  const [data, setData] = useState<ProfilePageData | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [range, setRange] = useState<Range>("all");
  // Hash-driven deep link from AchievementToast: clicking the toast
  // sends the player to /profile#trophy-{id}. We capture the id once
  // on mount and pipe it down so the matching section auto-expands
  // and scrolls into view, without this, the link landed at the top
  // of /profile with the trophy panel still collapsed.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#trophy-")) return;
    setHighlightId(hash.slice("#trophy-".length));
  }, []);

  useEffect(() => {
    const cachedData = readCache<ProfilePageData>(PROFILE_CACHE_KEY);
    if (cachedData) setData(cachedData);
    const cachedJournal = readCache<JournalEntry[]>(JOURNAL_CACHE_KEY);
    if (cachedJournal && cachedJournal.length > 0) setJournal(cachedJournal);

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
  // Map: achievement id → { unlockedAt, claimedAt }. The `claimedAt
  // === null` case is what powers the unclaimed/Claim UI in
  // TrophySection.
  const unlockedMap = new Map(
    trophyUnlocked.map(
      (u) => [u.id, { unlockedAt: u.unlockedAt, claimedAt: u.claimedAt }] as const
    )
  );
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = trophyUnlocked.length;
  const completion = Math.round((unlockedCount / totalCount) * 100);

  const foundations: AchievementDef[] = [];
  const progression: AchievementDef[] = [];
  const training: AchievementDef[] = [];
  const community: AchievementDef[] = [];
  const devotion: AchievementDef[] = [];
  const elemental: AchievementDef[] = [];
  const shadow: AchievementDef[] = [];
  const byDungeon = new Map<string, AchievementDef[]>();
  for (const def of ACHIEVEMENTS) {
    // Hidden trophies (Shadow category) only appear in the grid
    // after the player has unlocked them, so they stay a surprise
    // until earned. Once unlocked they render normally.
    if (def.hidden && !unlockedMap.has(def.id)) continue;
    const cat = achievementCategory(def.id);
    if (cat.category === "foundations") foundations.push(def);
    else if (cat.category === "progression") progression.push(def);
    else if (cat.category === "training") training.push(def);
    else if (cat.category === "community") community.push(def);
    else if (cat.category === "devotion") devotion.push(def);
    else if (cat.category === "elemental") elemental.push(def);
    else if (cat.category === "shadow") shadow.push(def);
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
    range === "week"
      ? tProfileOwn("rangeWeek")
      : range === "month"
        ? tProfileOwn("rangeMonth")
        : tProfileOwn("rangeAll");

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {tProfile("title")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <HunterCard
          totalXp={stats.totalXp}
          scattered={stats.scattered}
          dimensions={stats.dimensions}
        />

        <RecentGains />

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
              {tProfileOwn("recordHeader", { label: rangeLabel })}
            </p>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatLine label={tProfile("stats.activeDungeons")} value={stats.activeRunCount} />
            <StatLine label={tProfile("stats.dungeonsCleared")} value={stats.completedRunCount} />
            <StatLine label={tProfile("stats.workoutsLogged")} value={windowed.workoutTotal} />
            <StatLine label={tProfile("stats.exposuresLogged")} value={windowed.exposureTotal} />
            <StatLine label={tProfile("stats.questsCompleted")} value={windowed.questTotal} />
            <StatLine label={tProfile("stats.perfectDays")} value={windowed.perfectQuestDays} />
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            {tProfile("dimensions")}
          </p>
          <StatRadar values={stats.dimensions} />
          <p className="text-[10px] text-slate-500 text-center mt-3 tracking-wider">
            {tProfileOwn("earnedFromQuests")}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            {tProfile("activityHeader")}
          </p>
          <Heatmap activity={data.heatmap} />
        </Card>

        <FriendsSection />

        <JournalSection
          entries={journal}
          onEntriesChange={(next) => {
            setJournal(next);
            writeCache(JOURNAL_CACHE_KEY, next);
          }}
          previewLimit={5}
          seeAllHref="/journal"
        />

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
              {tProfile("trophies")}
            </p>
            <p className="text-xs text-slate-300">
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
            label={tProfile("categories.foundations")}
            defs={foundations}
            unlockedMap={unlockedMap}
            highlightId={highlightId}
          />
          <TrophySection
            label={tProfile("categories.progression")}
            defs={progression}
            unlockedMap={unlockedMap}
            highlightId={highlightId}
          />
          <TrophySection
            label={tProfile("categories.training")}
            defs={training}
            unlockedMap={unlockedMap}
            highlightId={highlightId}
          />
          <TrophySection
            label={tProfile("categories.community")}
            defs={community}
            unlockedMap={unlockedMap}
            highlightId={highlightId}
          />
          <TrophySection
            label={tProfile("categories.devotion")}
            defs={devotion}
            unlockedMap={unlockedMap}
            highlightId={highlightId}
          />
          <TrophySection
            label={tProfile("categories.elemental")}
            defs={elemental}
            unlockedMap={unlockedMap}
            highlightId={highlightId}
          />
          {shadow.length > 0 && (
            <TrophySection
              label={tProfile("categories.shadow")}
              defs={shadow}
              unlockedMap={unlockedMap}
              highlightId={highlightId}
            />
          )}
          <div className="mt-8">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-cyan-500/40" />
              <p className="font-display text-[10px] tracking-[0.4em] uppercase text-cyan-300/80 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                {tProfile("categories.dungeonMastery")}
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
                    label={tDungeons(`${dungeonKey(d.id)}.name`)}
                    defs={defs}
                    unlockedMap={unlockedMap}
                    nested
                    highlightId={highlightId}
                  />
                );
              })}
            </div>
          </div>
        </Card>

      </div>
    </main>
  );
}

interface UnlockedEntry {
  unlockedAt: string;
  claimedAt: string | null;
}

function TrophySection({
  label,
  defs,
  unlockedMap,
  nested,
  highlightId,
}: {
  label: string;
  defs: AchievementDef[];
  unlockedMap: Map<string, UnlockedEntry>;
  nested?: boolean;
  /** Achievement id from window.location.hash. If it matches a trophy in
   *  this section, the section auto-expands on mount and scrolls into
   *  view, driven by AchievementToast deep-linking to /profile#trophy-X. */
  highlightId?: string | null;
}) {
  const tAchievements = useTranslations("achievements");
  const tDungeons = useTranslations("dungeons");
  const tRungs = useTranslations("rungs");
  const tRarity = useTranslations("rarityLabels");
  const containsHighlight =
    !!highlightId && defs.some((d) => d.id === highlightId);
  const [expanded, setExpanded] = useState(containsHighlight);

  useEffect(() => {
    if (!containsHighlight) return;
    setExpanded(true);
    // Wait for the expand to render before scrolling.
    const t = setTimeout(() => {
      const el = document.getElementById(`trophy-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [containsHighlight, highlightId]);
  // Tracks ids the player has just tapped Claim on, so the UI flips
  // to claimed instantly without waiting for the server action +
  // refetch round trip. Server state catches up via notifyStatsUpdated.
  const [claimedLocal, setClaimedLocal] = useState<Set<string>>(new Set());
  const [claiming, setClaiming] = useState<string | null>(null);

  async function handleClaim(id: string) {
    if (claiming) return;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    const xpReward = def ? TROPHY_XP_BY_RARITY[def.rarity] : 0;
    setClaiming(id);
    setClaimedLocal((prev) => new Set(prev).add(id));
    // Optimistic: fire the floating "+N XP" GainToast and the XP-delta
    // event BEFORE awaiting the server action. Same pattern DailyQuests
    // uses, the visual is instant on tap, the server confirms in the
    // background. Without this, the toast waited 1-1.5s for the server
    // roundtrip, which felt sluggish vs the quest tick.
    if (xpReward > 0) {
      notifyReward({
        xp: xpReward,
        source: "🏆 Trophy Claimed",
      });
      // Optimistic XP-delta drives the Navbar XP bar bump immediately.
      notifyStatsUpdated({ xpDelta: xpReward });
    }
    try {
      await claimAchievement(id);
      // No-delta refetch confirms with the server's authoritative
      // numbers (catches edge cases where the optimistic delta drifts
      // from server truth, shouldn't happen here, but defensive).
      notifyStatsUpdated();
    } catch {
      // Rollback: undo the optimistic XP and re-show the Claim button.
      if (xpReward > 0) {
        notifyStatsUpdated({ xpDelta: -xpReward });
      }
      setClaimedLocal((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setClaiming(null);
    }
  }

  if (defs.length === 0) return null;
  const unlockedHere = defs.filter((d) => unlockedMap.has(d.id)).length;
  // Unclaimed = unlocked but the player hasn't tapped Claim yet.
  // Drives the amber dot/count next to the section header so the
  // player can find their pending trophies without opening every panel.
  const unclaimedHere = defs.filter((d) => {
    const entry = unlockedMap.get(d.id);
    return entry && entry.claimedAt === null && !claimedLocal.has(d.id);
  }).length;
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
        <div className="flex items-center gap-2 min-w-0">
          <p
            className={`tracking-[0.3em] uppercase text-left ${
              nested ? "text-[10px] text-cyan-400/70" : "text-[10px] text-slate-300"
            }`}
          >
            {label}
          </p>
          {unclaimedHere > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber-500/30 border border-amber-400/70 text-amber-200 text-[10px] font-bold tabular-nums shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse-slow"
              aria-label={`${unclaimedHere} unclaimed`}
            >
              {unclaimedHere}
            </span>
          )}
        </div>
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
          const entry = unlockedMap.get(def.id);
          const style = rarityStyle(def.rarity);
          const isUnlocked = !!entry;
          const isClaimed =
            (entry && entry.claimedAt !== null) || claimedLocal.has(def.id);
          const isUnclaimed = isUnlocked && !isClaimed;
          const xpReward = TROPHY_XP_BY_RARITY[def.rarity];
          const labels = resolveAchievementLabels(
            def.id,
            tAchievements,
            tDungeons,
            tRungs,
            { name: def.name, description: def.description }
          );
          return (
            <div
              key={def.id}
              id={`trophy-${def.id}`}
              className={`relative border rounded-lg p-3 transition-all scroll-mt-32 sm:scroll-mt-24 ${
                isUnclaimed
                  ? `${style.bg} ${style.border} shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse-slow`
                  : isUnlocked
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
                    className={`text-xs font-bold uppercase tracking-wider leading-tight ${
                      isUnlocked ? style.text : "text-slate-600"
                    }`}
                  >
                    {isUnlocked ? labels.name : "???"}
                  </p>
                  <p
                    className={`text-[11px] leading-relaxed mt-1 ${
                      isUnlocked ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {labels.description}
                  </p>
                  <p
                    className={`text-[9px] uppercase tracking-widest mt-1 ${
                      isUnlocked ? style.text : "text-slate-700"
                    }`}
                  >
                    {tRarity(def.rarity)}
                  </p>
                </div>
              </div>
              {isUnclaimed && (
                <button
                  type="button"
                  onClick={() => handleClaim(def.id)}
                  disabled={claiming === def.id}
                  className="mt-3 w-full px-3 py-1.5 bg-amber-500/20 border border-amber-400/70 text-amber-200 text-[10px] tracking-[0.3em] uppercase font-bold rounded hover:bg-amber-500/30 hover:text-amber-100 transition-colors disabled:opacity-50 disabled:cursor-wait shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                >
                  {claiming === def.id ? "Claiming…" : `Claim · +${xpReward} XP`}
                </button>
              )}
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

function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  const t = useTranslations("profile");
  const options: { id: Range; label: string }[] = [
    { id: "week", label: t("range7d") },
    { id: "month", label: t("range30d") },
    { id: "all", label: t("rangeAllShort") },
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