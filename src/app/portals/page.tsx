"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Card from "@/components/Card";
import Paywall from "@/components/Paywall";
import {
  DUNGEONS,
  dungeonDims,
  DIM_STYLE,
} from "@/lib/dungeons";
import { HUNTER_TYPE_DEFS, isHunterType } from "@/lib/hunterType";
import { dungeonKey } from "@/lib/i18nKeys";
import { enterDungeon, getAllActiveRuns } from "@/app/actions/dungeons";
import { track } from "@/lib/analytics";
import { readCache, writeCache } from "@/lib/offlineCache";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import { addRunToCache, endRunInCache } from "@/lib/dashboardCacheOps";

const ACTIVE_RUNS_CACHE_KEY = "activeRuns";

type CachedRun = { dungeonId: string };

export default function PortalsPage() {
  const t = useTranslations("portals");
  const tDungeons = useTranslations("dungeons");
  const tHunterTypes = useTranslations("hunterTypes");
  const tPortalsExtra = useTranslations("portalsExtra");
  const router = useRouter();
  const { user } = useUser();
  const meta = user?.unsafeMetadata as { hunterType?: string } | undefined;
  const viewerHunterType =
    typeof meta?.hunterType === "string" && isHunterType(meta.hunterType)
      ? meta.hunterType
      : null;
  // Initialize null on both server and client to keep SSR and first
  // client render identical. Cache and server fetch happen in useEffect.
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    const cached = readCache<CachedRun[]>(ACTIVE_RUNS_CACHE_KEY);
    if (cached) {
      setActiveIds(new Set(cached.map((r) => r.dungeonId)));
    }
    getAllActiveRuns()
      .then((runs) => {
        writeCache(ACTIVE_RUNS_CACHE_KEY, runs);
        setActiveIds(new Set<string>(runs.map((r) => r.dungeonId)));
      })
      .catch(() => {});
  }, []);

  async function handleEnter(dungeonId: string) {
    addRunToCache(dungeonId, null);

    try {
      await enterDungeon(dungeonId);
    } catch (err) {
      if (err instanceof Error && err.message === "PAYWALL") {
        endRunInCache(dungeonId);
        setPaywallOpen(true);
        return;
      }
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:enter",
        dungeonId,
      });
      drainQueue().catch(() => {});
    }

    setActiveIds((prev) => {
      const next = new Set(prev ?? []);
      next.add(dungeonId);
      return next;
    });
    track("dungeon_entered", { dungeon_id: dungeonId });
    router.push(`/#dungeon-${dungeonId}`);
  }

  // Three buckets — drives the section layout. yourPath = dungeons
  // matching the player's hunter type. universal = no path required.
  // otherPaths = path-gated dungeons that aren't the player's. When
  // Unaffiliated, yourPath is empty and the section shows a CTA.
  const yourPath = DUNGEONS.filter(
    (d) => !!d.hunterType && d.hunterType === viewerHunterType
  );
  const universal = DUNGEONS.filter((d) => !d.hunterType);
  const otherPaths = DUNGEONS.filter(
    (d) => !!d.hunterType && d.hunterType !== viewerHunterType
  );

  function renderDungeonCard(d: (typeof DUNGEONS)[number], opts?: { locked?: boolean }) {
    const isActive = activeIds?.has(d.id) ?? false;
    const loaded = activeIds !== null;
    const rules = tDungeons.raw(`${dungeonKey(d.id)}.rules`) as string[];
    const isExpanded = expandedId === d.id;
    const pathDef = d.hunterType ? HUNTER_TYPE_DEFS[d.hunterType] : null;
    const locked = opts?.locked ?? false;

    return (
      <Card
        key={d.id}
        className={`p-6 group relative transition-all duration-300 cursor-pointer ${
          locked
            ? "opacity-60 hover:opacity-90 hover:border-slate-600"
            : "hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] focus-within:border-cyan-400/50"
        } ${
          isExpanded && !locked
            ? "border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.25)]"
            : ""
        }`}
        onClick={() => setExpandedId(isExpanded ? null : d.id)}
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {dungeonDims(d).map((dim) => (
                <span
                  key={dim}
                  className={`text-[9px] font-bold uppercase tracking-[0.25em] px-1.5 py-0.5 border rounded-sm ${DIM_STYLE[dim]}`}
                >
                  {dim}
                </span>
              ))}
              {/* Path badge only when it's NOT in a path-context section.
                  In Your Path / Other Paths sections, the section header
                  carries the path framing — per-card duplication is noise. */}
              {pathDef && !locked && d.hunterType !== viewerHunterType && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.25em] px-1.5 py-0.5 border rounded-sm ${pathDef.badgeStyle}`}
                >
                  {tHunterTypes(`${pathDef.id}.label`)}
                </span>
              )}
            </div>
            <h2
              className={`font-display text-xl font-bold uppercase tracking-wider flex items-center gap-2 ${
                locked
                  ? "text-slate-300"
                  : "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              }`}
            >
              {d.icon && (
                <span aria-hidden className="text-lg leading-none">
                  {d.icon}
                </span>
              )}
              <span>{tDungeons(`${dungeonKey(d.id)}.name`)}</span>
            </h2>
          </div>
          {isActive && (
            <span className="shrink-0 text-[10px] uppercase tracking-widest text-emerald-400 border border-emerald-400/40 rounded px-2 py-1">
              {t("active")}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {tDungeons(`${dungeonKey(d.id)}.description`)}
        </p>

        {d.tiers && (
          <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-5">
            {d.tiers.map((t) => (
              <div
                key={t.rank}
                className="text-center bg-slate-800/50 border border-slate-700 rounded py-1.5 sm:py-2"
              >
                <div className="text-xs sm:text-sm font-bold text-slate-300">
                  {t.rank}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-600">
                  {t.days}d
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={`overflow-hidden transition-all duration-500 ease-out group-hover:max-h-96 group-hover:opacity-100 group-focus-within:max-h-96 group-focus-within:opacity-100 ${
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mb-5 border-t border-cyan-500/20 pt-4">
            <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 mb-2">
              {t("rules")}
            </p>
            <ul className="space-y-1.5">
              {rules.map((rule, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-300 leading-relaxed flex gap-2"
                >
                  <span className="text-cyan-400/60 mt-0.5">▸</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {loaded &&
          (isActive ? (
            <Link
              href={`/#dungeon-${d.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block w-full text-center px-4 py-3 bg-slate-800/60 border border-cyan-500/30 rounded text-cyan-300 text-xs uppercase tracking-widest hover:bg-cyan-500/20 transition-colors"
            >
              {t("viewInStatus")}
            </Link>
          ) : locked && pathDef ? (
            <Link
              href="/path"
              onClick={(e) => e.stopPropagation()}
              className="block w-full text-center px-4 py-3 border border-slate-700 rounded text-slate-300 text-xs uppercase tracking-widest hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
            >
              {t("switchTo", {
                label: tHunterTypes(`${pathDef.id}.label`),
              })}
            </Link>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEnter(d.id);
              }}
              className="w-full px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-300 text-sm uppercase tracking-widest hover:bg-cyan-500/30 active:scale-[0.98] transition-all drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
            >
              {t("enter")}
            </button>
          ))}
      </Card>
    );
  }

  function SectionHeader({
    title,
    subtitle,
    accent,
  }: {
    title: string;
    subtitle?: string;
    accent?: string;
  }) {
    return (
      <div className="text-center mb-4">
        <p
          className={`text-xs tracking-[0.4em] uppercase ${
            accent ?? "text-cyan-400/70"
          }`}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-1">
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-10">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {t("header")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        {/* Your Path */}
        <section>
          <SectionHeader
            title={t("yourPath")}
            subtitle={
              viewerHunterType
                ? t("yourPathSubtitleSet", {
                    label: tHunterTypes(`${viewerHunterType}.label`),
                  })
                : t("yourPathSubtitleUnset")
            }
          />
          {yourPath.length > 0 ? (
            <div className="space-y-4">
              {yourPath.map((d) => renderDungeonCard(d))}
              <div className="text-center">
                <Link
                  href="/path"
                  className="inline-block text-[10px] tracking-[0.3em] uppercase text-slate-500 hover:text-cyan-300 transition-colors border-b border-slate-700 hover:border-cyan-400/60 pb-0.5"
                >
                  {tPortalsExtra("changePath")}
                </Link>
              </div>
            </div>
          ) : (
            <Card className="p-5 text-center bg-slate-900/40 border-slate-800">
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {t("yourPathEmpty")}
              </p>
              <Link
                href="/path"
                className="inline-block px-4 py-2 border border-cyan-500/40 rounded text-cyan-300 text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500/15 transition-colors"
              >
                {t("yourPathCta")}
              </Link>
            </Card>
          )}
        </section>

        {/* Universal */}
        <section>
          <SectionHeader
            title={t("universal")}
            subtitle={t("universalSubtitle")}
          />
          <div className="space-y-4">
            {universal.map((d) => renderDungeonCard(d))}
          </div>
        </section>

        {/* Other Paths */}
        {otherPaths.length > 0 && (
          <section>
            <SectionHeader
              title={t("otherPaths")}
              subtitle={t("otherPathsSubtitle")}
              accent="text-slate-500"
            />
            <div className="space-y-4">
              {otherPaths.map((d) => renderDungeonCard(d, { locked: true }))}
            </div>
          </section>
        )}
      </div>
      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </main>
  );
}