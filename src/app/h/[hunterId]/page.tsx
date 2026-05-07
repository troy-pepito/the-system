import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import {
  getPublicHunterData,
  type PublicHunterData,
} from "@/app/actions/achievements";
import {
  ACHIEVEMENTS,
  achievementCategory,
  isComboAchievementId,
  rarityStyle,
  resolveAchievementLabels,
  type AchievementDef,
} from "@/lib/achievements";
import { DUNGEONS, getDungeon } from "@/lib/dungeons";
import { HUNTER_TYPE_DEFS, isHunterType } from "@/lib/hunterType";
import { dungeonKey } from "@/lib/i18nKeys";
import { getRankStyle } from "@/lib/rankStyle";
import Card from "@/components/Card";
import StatRadar from "@/components/StatRadar";
import Heatmap from "@/components/Heatmap";
import FriendActions from "@/components/FriendActions";

interface Props {
  params: Promise<{ hunterId: string }>;
}

export default async function PublicHunterPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    return <main className="min-h-screen bg-slate-950" />;
  }

  const { hunterId } = await params;
  const data = await getPublicHunterData(hunterId);
  if (!data) notFound();

  return <PublicProfile data={data} />;
}

async function PublicProfile({ data }: { data: PublicHunterData }) {
  const tDungeons = await getTranslations("dungeons");
  const tHunterCard = await getTranslations("hunterCard");
  const tHunterTypes = await getTranslations("hunterTypes");
  const tProfile = await getTranslations("publicProfile");
  const tEntryTypes = await getTranslations("entryTypes");
  const rankFrame = getRankStyle(data.rank);
  const trophyUnlocked = data.unlocked.filter(
    (u) => !isComboAchievementId(u.id)
  );
  const unlockedMap = new Map(
    trophyUnlocked.map((u) => [u.id, u.unlockedAt])
  );
  const unlockedCount = trophyUnlocked.length;

  const unlockedDefs = ACHIEVEMENTS.filter((d) => unlockedMap.has(d.id));

  const foundations: AchievementDef[] = [];
  const progression: AchievementDef[] = [];
  const training: AchievementDef[] = [];
  const byDungeon = new Map<string, AchievementDef[]>();
  for (const def of unlockedDefs) {
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

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {tProfile("title")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <div className="relative">
          <div
            className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
          />
          <div
            className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
          />
          <div
            className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
          />
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
          />

          <div
            className={`relative bg-slate-950/80 border p-5 sm:p-6 ${rankFrame.cardBorder} ${rankFrame.cardGlow}`}
              >
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[9px] text-cyan-400/70 tracking-[0.4em] uppercase">
                {tHunterCard("id")}
              </p>
              <FriendActions hunterId={data.hunterId} variant="compact" />
            </div>
            <div className="flex items-center gap-5">
              <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 overflow-hidden border border-cyan-400/50 bg-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                {data.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.imageUrl}
                    alt={data.hunterName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-3xl font-bold">
                    ?
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">
                    {tHunterCard("name")}
                  </p>
                  {data.scattered && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-red-500/50 bg-red-500/10 text-[9px] text-red-300 tracking-[0.25em] uppercase rounded-sm">
                      <span aria-hidden>⚠</span>
                      <span>{tHunterCard("scattered")}</span>
                    </span>
                  )}
                </div>
                <p className="font-display text-lg sm:text-xl font-bold text-cyan-100 truncate tracking-wider">
                  {data.hunterName}
                </p>
                {data.hunterType && isHunterType(data.hunterType) && (
                  <span
                    className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 border rounded-sm text-[9px] tracking-[0.3em] uppercase font-bold ${HUNTER_TYPE_DEFS[data.hunterType].badgeStyle}`}
                  >
                    {tHunterTypes(`${data.hunterType}.label`)}
                  </span>
                )}
                <div className="flex items-center gap-5 mt-5">
                  <div>
                    <p className="text-[9px] text-slate-500 tracking-widest uppercase">
                      {tHunterCard("rank")}
                    </p>
                    <p
                      className={`text-2xl font-bold leading-none mt-1 ${
                        getRankStyle(data.rank).text
                      } ${getRankStyle(data.rank).textClass} ${
                        getRankStyle(data.rank).glow
                      }`}
                    >
                      {data.rank}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-slate-700" />
                  <div>
                    <p className="text-[9px] text-slate-500 tracking-widest uppercase">
                      {tHunterCard("level")}
                    </p>
                    <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] leading-none mt-1">
                      {data.level}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-slate-700" />
                  <div>
                    <p className="text-[9px] text-slate-500 tracking-widest uppercase">
                      {tHunterCard("xp")}
                    </p>
                    <p className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] leading-none mt-1 tabular-nums">
                      {data.totalXp}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            {tProfile("recordLifetime")}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatLine
              label={tProfile("stats.activeDungeons")}
              value={data.activeRuns.length}
            />
            <StatLine
              label={tProfile("stats.dungeonsCleared")}
              value={data.completedRunCount}
            />
            <StatLine label={tProfile("stats.workoutsLogged")} value={data.workoutTotal} />
            <StatLine label={tProfile("stats.exposuresLogged")} value={data.exposureTotal} />
            <StatLine label={tProfile("stats.questsCompleted")} value={data.questTotal} />
            <StatLine
              label={tProfile("stats.perfectDays")}
              value={data.perfectQuestDays}
            />
          </div>
        </Card>

        {data.activeRuns.length > 0 && (
          <Card className="p-6">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
              {tProfile("activeDungeons")}
            </p>
            <ul className="space-y-2">
              {data.activeRuns.map((run) => {
                const d = getDungeon(run.dungeonId);
                const name = d
                  ? tDungeons(`${dungeonKey(run.dungeonId)}.name`)
                  : run.dungeonId;
                return (
                  <li
                    key={run.dungeonId}
                    className="flex items-center justify-between border border-slate-800 rounded-lg p-3"
                  >
                    <span className="text-sm text-cyan-200 uppercase tracking-wider">
                      {name}
                    </span>
                    <span className="text-sm text-emerald-400 font-bold tabular-nums">
                      {run.displayValue}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            {tProfile("dimensions")}
          </p>
          <StatRadar values={data.dimensions} />
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            {tProfile("activityHeader")}
          </p>
          <Heatmap activity={data.heatmap} />
        </Card>

        {data.publicJournal.length > 0 && (
          <Card className="p-6">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
              {tProfile("reflections")}
            </p>
            <ul className="space-y-4">
              {data.publicJournal.map((e) => {
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
                        {dungeon
                          ? tDungeons(`${dungeonKey(e.dungeonId)}.name`)
                          : e.dungeonId}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm ${publicEntryTone(e.type)}`}
                      >
                        {publicEntryLabel(e.type, tEntryTypes)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {e.note}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
              {tProfile("trophies")}
            </p>
            <p className="text-xs text-slate-400">
              <span className="text-amber-300 font-bold">
                {unlockedCount}
              </span>
              <span className="text-slate-500 ml-1">{tProfile("earned")}</span>
            </p>
          </div>

          {unlockedCount === 0 && (
            <p className="text-xs text-slate-500 leading-relaxed">
              {tProfile("noTrophies")}
            </p>
          )}

          <TrophyList
            label={tProfile("categories.foundations")}
            defs={foundations}
          />
          <TrophyList
            label={tProfile("categories.progression")}
            defs={progression}
          />
          <TrophyList
            label={tProfile("categories.training")}
            defs={training}
          />
          {byDungeon.size > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-cyan-500/40" />
                <p className="font-display text-[10px] tracking-[0.4em] uppercase text-cyan-300/80 shrink-0">
                  {tProfile("categories.dungeonMastery")}
                </p>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-cyan-500/40" />
              </div>
              <div className="space-y-5">
                {DUNGEONS.map((d) => {
                  const defs = byDungeon.get(d.id);
                  if (!defs || defs.length === 0) return null;
                  return (
                    <TrophyList
                      key={d.id}
                      label={tDungeons(`${dungeonKey(d.id)}.name`)}
                      defs={defs}
                      nested
                    />
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function publicEntryLabel(
  type: string,
  t: (key: string) => string
): string {
  if (type === "relapse" || type === "completed" || type === "journal") {
    return t(type);
  }
  return type.replace(/-/g, " ");
}

function publicEntryTone(type: string): string {
  if (type === "relapse") return "text-red-300 border-red-500/40 bg-red-500/10";
  if (type === "completed")
    return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  if (type === "journal")
    return "text-slate-300 border-slate-600 bg-slate-800/60";
  return "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";
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

async function TrophyList({
  label,
  defs,
  nested,
}: {
  label: string;
  defs: AchievementDef[];
  nested?: boolean;
}) {
  if (defs.length === 0) return null;
  const tAchievements = await getTranslations("achievements");
  const tDungeons = await getTranslations("dungeons");
  const tRungs = await getTranslations("rungs");
  const tRarity = await getTranslations("rarityLabels");
  return (
    <div className={nested ? "" : "mt-6 first:mt-0"}>
      <div className="flex items-center justify-between gap-3 py-2 mb-3">
        <p
          className={`tracking-[0.3em] uppercase text-left ${
            nested ? "text-[10px] text-cyan-400/70" : "text-[10px] text-slate-400"
          }`}
        >
          {label}
        </p>
        <p className="text-[10px] text-amber-300 font-mono">
          {defs.length}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {defs.map((def) => {
          const style = rarityStyle(def.rarity);
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
              className={`relative border rounded-lg p-3 transition-all ${style.bg} ${style.border} ${style.glow}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`text-xl font-bold flex-shrink-0 w-9 h-9 flex items-center justify-center border rounded ${style.text} ${style.border} ${style.bg} ${style.glow}`}
                >
                  {def.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider truncate ${style.text}`}
                  >
                    {labels.name}
                  </p>
                  <p className="text-[11px] leading-relaxed mt-1 text-slate-300">
                    {labels.description}
                  </p>
                  <p
                    className={`text-[9px] uppercase tracking-widest mt-1 ${style.text}`}
                  >
                    {tRarity(def.rarity)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}