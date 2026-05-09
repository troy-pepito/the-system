import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  DUNGEONS,
  dungeonDims,
  DIM_STYLE,
  type DungeonRuleType,
} from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
import {
  XP_PER_STREAK_DAY,
  XP_PER_WORKOUT,
  XP_PER_EXPOSURE,
  XP_PER_COMPLETION,
} from "@/lib/player";
import { COMBO_MILESTONES, COMBO_THRESHOLD } from "@/lib/quests";

export const metadata = {
  title: "Hunter Guide — Shivaliva Leveling",
  description:
    "The manual for the System. Ranks, dungeons, dimensions, combos, and what Pro unlocks.",
};

const RULE_TYPE_KEYS: DungeonRuleType[] = [
  "continuous_streak",
  "cadence",
  "timed",
  "progressive",
];

const DIM_KEYS: (keyof typeof DIM_STYLE)[] = [
  "body",
  "mind",
  "emotion",
  "energy",
  "spirit",
];

const RANKS_LADDER = [
  { rank: "E", start: 1, end: 10 },
  { rank: "D", start: 11, end: 20 },
  { rank: "C", start: 21, end: 30 },
  { rank: "B", start: 31, end: 40 },
  { rank: "A", start: 41, end: 50 },
  { rank: "S", start: 51, end: 60 },
];

export default async function GuidePage() {
  const tDungeons = await getTranslations("dungeons");
  const t = await getTranslations("guide");
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <article className="max-w-3xl mx-auto space-y-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.4em] uppercase text-slate-500 hover:text-cyan-300 transition-colors"
        >
          <span aria-hidden>←</span>
          <span>Back</span>
        </Link>
        <header className="text-center border-b border-slate-800 pb-10">
          <p className="text-[10px] tracking-[0.5em] text-cyan-400/70 uppercase mb-4 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            {t("header")}
          </p>
          <h1 className="font-display text-aberration text-3xl sm:text-4xl font-bold tracking-tight text-cyan-100 mb-4">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </header>

        <Section title={t("section1Title")}>
          <p>{t("section1P1")}</p>
          <p>{t("section1P2")}</p>
        </Section>

        <Section title={t("section2Title")}>
          <p className="mb-6">{t("section2Intro")}</p>
          <div className="space-y-4">
            {RULE_TYPE_KEYS.map((rt) => (
              <div
                key={rt}
                className="border border-slate-800 bg-slate-900/40 p-5 rounded"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <p className="font-display text-sm font-bold text-cyan-200 uppercase tracking-wider">
                    {t(`ruleLabels.${rt}`)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    {t(`ruleUsedBy.${rt}`)}
                  </p>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t(`ruleSummaries.${rt}`)}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("section3Title")}>
          <p className="mb-6">{t("section3Intro")}</p>
          <div className="space-y-4">
            {DUNGEONS.map((d) => (
              <div
                key={d.id}
                className="border border-slate-800 bg-slate-900/40 p-5 rounded"
              >
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <p className="font-display text-base font-bold text-cyan-100 flex items-center gap-2">
                    {d.icon && (
                      <span aria-hidden className="leading-none">
                        {d.icon}
                      </span>
                    )}
                    <span>{tDungeons(`${dungeonKey(d.id)}.name`)}</span>
                  </p>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-amber-400/80 px-2 py-0.5 border border-amber-400/30 rounded-sm">
                    {t(`ruleLabels.${d.ruleType}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {dungeonDims(d).map((dim) => (
                    <span
                      key={dim}
                      className={`text-[9px] font-bold uppercase tracking-[0.25em] px-1.5 py-0.5 border rounded-sm ${DIM_STYLE[dim]}`}
                    >
                      {dim}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {tDungeons(`${dungeonKey(d.id)}.description`)}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("section4Title")}>
          <p className="mb-5">{t("section4Intro")}</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {RANKS_LADDER.map((r) => (
              <div
                key={r.rank}
                className="text-center bg-slate-900/40 border border-slate-800 rounded py-3"
              >
                <p className="text-xl font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                  {r.rank}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 tracking-wider uppercase">
                  {t("rankLevels", { start: r.start, end: r.end })}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-400 leading-relaxed">
            {t("xpDropsIntro")}
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-cyan-300 font-mono">
                  +{XP_PER_STREAK_DAY}
                </span>{" "}
                {t("xpStreakDay")}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-cyan-300 font-mono">
                  +{XP_PER_WORKOUT}
                </span>{" "}
                {t("xpWorkout")}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-cyan-300 font-mono">
                  +{XP_PER_EXPOSURE}
                </span>{" "}
                {t("xpExposure")}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-amber-300 font-mono">
                  +{XP_PER_COMPLETION}
                </span>{" "}
                {t("xpCompletion")}
              </span>
            </li>
          </ul>
        </Section>

        <Section title={t("section5Title")}>
          <p className="mb-6">{t("section5Intro")}</p>
          <div className="space-y-4">
            {DIM_KEYS.map((dimKey) => (
              <div
                key={dimKey}
                className="flex items-start gap-4 border border-slate-800 bg-slate-900/40 p-5 rounded"
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.3em] px-2 py-1 border rounded-sm shrink-0 self-start ${DIM_STYLE[dimKey]}`}
                >
                  {t(`dimensions.${dimKey}.name`)}
                </span>
                <p className="text-sm text-slate-400 leading-relaxed flex-1">
                  {t(`dimensions.${dimKey}.description`)}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("section6Title")}>
          <p>{t("section6P1")}</p>
          <p className="mt-3">
            {t.rich("section6P2", {
              threshold: COMBO_THRESHOLD,
              b: (chunks) => (
                <span className="text-cyan-300 font-bold">{chunks}</span>
              ),
            })}
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMBO_MILESTONES.map((m) => (
              <div
                key={m.days}
                className="text-center bg-slate-900/40 border border-amber-400/20 rounded py-3"
              >
                <p className="text-lg font-bold text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
                  {m.days}d
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  +{m.xp} XP
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-500 leading-relaxed">
            {t("section6Footnote")}
          </p>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            {t("section6PerfectDay")}
          </p>
        </Section>

        <Section title={t("section7Title")}>
          <p>
            {t.rich("section7P1", {
              scattered: (chunks) => (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-red-500/50 bg-red-500/10 text-[10px] text-red-300 tracking-[0.2em] uppercase rounded-sm align-middle">
                  {chunks}
                </span>
              ),
            })}
          </p>
          <p className="mt-3">{t("section7P2")}</p>
          <p className="mt-3">{t("section7P3")}</p>
        </Section>

        <Section title={t("section8Title")}>
          <p>{t("section8Intro")}</p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">{t("section8PublicProfileLabel")}</span>{" "}
            {t.rich("section8PublicProfileBody", {
              code: (chunks) => (
                <span className="font-mono text-cyan-300">{chunks}</span>
              ),
              profileLink: (chunks) => (
                <Link
                  href="/profile"
                  className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">{t("section8FriendsLabel")}</span>{" "}
            {t.rich("section8FriendsBody", {
              addFriend: (chunks) => (
                <span className="text-cyan-300 font-mono">{chunks}</span>
              ),
            })}
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">{t("section8JournalLabel")}</span>{" "}
            {t.rich("section8JournalBody", {
              code: (chunks) => (
                <span className="font-mono text-cyan-300">{chunks}</span>
              ),
            })}
          </p>
        </Section>

        <Section title={t("sectionGuildsTitle")}>
          <p className="mb-4">{t("sectionGuildsIntro")}</p>
          <p>
            <span className="text-cyan-300 font-bold">
              {t("sectionGuildsLabel")}
            </span>{" "}
            {t.rich("sectionGuildsBody", {
              guildsLink: (chunks) => (
                <Link
                  href="/guilds"
                  className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">
              {t("sectionBoardLabel")}
            </span>{" "}
            {t.rich("sectionBoardBody", {
              code: (chunks) => (
                <span className="font-mono text-cyan-300">{chunks}</span>
              ),
              boardLink: (chunks) => (
                <Link
                  href="/leaderboard"
                  className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Section>

        <Section title={t("section9Title")}>
          <p>
            <span className="text-cyan-300 font-bold">{t("section9DailyLabel")}</span>{" "}
            {t("section9DailyBody")}
          </p>
          <p className="mt-3 text-xs text-slate-500">{t("section9DailyNote")}</p>

          <p className="mt-5">
            <span className="text-cyan-300 font-bold">{t("section9InstallLabel")}</span>{" "}
            {t("section9InstallIntro")}
          </p>
          <ul className="mt-3 space-y-2 text-xs text-slate-400">
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                {t.rich("section9InstallIos", {
                  b: (chunks) => (
                    <span className="text-slate-300 font-semibold">{chunks}</span>
                  ),
                  code: (chunks) => (
                    <span className="text-cyan-300 font-mono">{chunks}</span>
                  ),
                })}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                {t.rich("section9InstallAndroid", {
                  b: (chunks) => (
                    <span className="text-slate-300 font-semibold">{chunks}</span>
                  ),
                  code: (chunks) => (
                    <span className="text-cyan-300 font-mono">{chunks}</span>
                  ),
                })}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                {t.rich("section9InstallDesktop", {
                  b: (chunks) => (
                    <span className="text-slate-300 font-semibold">{chunks}</span>
                  ),
                  code: (chunks) => (
                    <span className="text-cyan-300 font-mono">{chunks}</span>
                  ),
                })}
              </span>
            </li>
          </ul>

          <p className="mt-5">
            <span className="text-cyan-300 font-bold">{t("section9OfflineLabel")}</span>{" "}
            {t("section9OfflineBody")}
          </p>
        </Section>

        <Section title={t("section10Title")}>
          <p>{t("section10P1")}</p>
          <p className="mt-3">{t("section10P2")}</p>
        </Section>

        <div className="pt-10 text-center border-t border-slate-800">
          <p className="text-sm text-slate-300 mb-6 tracking-widest">
            {t("ctaText")}
          </p>
          <Link
            href="/portals"
            className="inline-block px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            {t("ctaButton")}
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg sm:text-xl font-bold text-cyan-200 uppercase tracking-wider mb-4">
        {title}
      </h2>
      <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}