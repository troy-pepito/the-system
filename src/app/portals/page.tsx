"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Paywall from "@/components/Paywall";
import {
  DUNGEONS,
  getDungeonRules,
  dungeonDims,
  DIM_STYLE,
} from "@/lib/dungeons";
import { enterDungeon, getAllActiveRuns } from "@/app/actions/dungeons";
import { track } from "@/lib/analytics";
import { readCache, writeCache } from "@/lib/offlineCache";

const ACTIVE_RUNS_CACHE_KEY = "activeRuns";

type CachedRun = { dungeonId: string };

export default function PortalsPage() {
  const router = useRouter();
  const [activeIds, setActiveIds] = useState<Set<string> | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = readCache<CachedRun[]>(ACTIVE_RUNS_CACHE_KEY);
    if (!cached) return null;
    return new Set(cached.map((r) => r.dungeonId));
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    getAllActiveRuns()
      .then((runs) => {
        writeCache(ACTIVE_RUNS_CACHE_KEY, runs);
        setActiveIds(new Set<string>(runs.map((r) => r.dungeonId)));
      })
      .catch(() => {});
  }, []);

  async function handleEnter(dungeonId: string) {
    try {
      await enterDungeon(dungeonId);
    } catch (err) {
      if (err instanceof Error && err.message === "PAYWALL") {
        setPaywallOpen(true);
        return;
      }
      throw err;
    }
    track("dungeon_entered", { dungeon_id: dungeonId });
    router.push(`/#dungeon-${dungeonId}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Portal Registry
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        {DUNGEONS.map((d) => {
          const isActive = activeIds?.has(d.id) ?? false;
          const loaded = activeIds !== null;
          const rules = getDungeonRules(d);
          const isExpanded = expandedId === d.id;
          return (
            <Card
              key={d.id}
              className={`p-6 group relative transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] focus-within:border-cyan-400/50 cursor-pointer ${
                isExpanded ? "border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.25)]" : ""
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
                  </div>
                  <h2 className="font-display text-xl font-bold text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] uppercase tracking-wider">
                    {d.name}
                  </h2>
                </div>
                {isActive && (
                  <span className="shrink-0 text-[10px] uppercase tracking-widest text-emerald-400 border border-emerald-400/40 rounded px-2 py-1">
                    Active
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {d.description}
              </p>

              {d.tiers && (
                <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-5">
                  {d.tiers.map((t) => (
                    <div
                      key={t.rank}
                      className="text-center bg-slate-800/50 border border-slate-700 rounded py-1.5 sm:py-2"
                    >
                      <div className="text-xs sm:text-sm font-bold text-slate-400">{t.rank}</div>
                      <div className="text-[9px] sm:text-[10px] text-slate-600">{t.days}d</div>
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
                    Rules of Engagement
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
                    View in Status Window
                  </Link>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnter(d.id);
                    }}
                    className="w-full px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-300 text-sm uppercase tracking-widest hover:bg-cyan-500/30 active:scale-[0.98] transition-all drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                  >
                    Enter Dungeon
                  </button>
                ))}
            </Card>
          );
        })}
      </div>
      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </main>
  );
}