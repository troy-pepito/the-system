import { auth } from "@clerk/nextjs/server";
import { getProfileStats } from "@/app/actions/achievements";
import { getRank, getXpForLevel } from "@/lib/player";
import { RANK_STYLES } from "@/lib/rankStyle";

export const metadata = {
  title: "Hunter Path — Shivaliva Leveling",
  description:
    "Six ranks. Six versions of yourself. The path from awakened to sovereign.",
};

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"] as const;

/** Levels-per-rank ladder. Mirrors getRank()'s LEVELS_PER_RANK = 10. */
const LEVELS_PER_RANK = 10;

/** Cumulative XP needed to reach the *first level* of each rank. */
function cumulativeXpToLevel(targetLevel: number): number {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl++) {
    total += getXpForLevel(lvl);
  }
  return total;
}

export default async function RanksPage() {
  const { userId } = await auth();
  if (!userId) {
    return <main className="min-h-screen bg-slate-950" />;
  }

  const stats = await getProfileStats();
  const currentRank = getRank(stats.level);
  const currentRankIdx = (RANK_ORDER as readonly string[]).indexOf(
    currentRank
  );

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Hunter Path
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <p className="text-[11px] text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
            Six ranks. Six versions of yourself. Each one earned, not bought.
          </p>
        </div>

        <div className="space-y-5">
          {RANK_ORDER.map((rank, idx) => {
            const style = RANK_STYLES[rank];
            const firstLevel = idx * LEVELS_PER_RANK + 1;
            const lastLevel = (idx + 1) * LEVELS_PER_RANK;
            const isLastRank = idx === RANK_ORDER.length - 1;
            const xpToReach = cumulativeXpToLevel(firstLevel);
            const earned = idx <= currentRankIdx;
            const isCurrent = idx === currentRankIdx;
            const locked = idx > currentRankIdx;

            return (
              <div key={rank} className="relative">
                {/* Corner brackets in the rank's tone */}
                <div
                  className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 z-10 pointer-events-none ${
                    earned ? style.cornerBorder : "border-slate-700"
                  }`}
                />
                <div
                  className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 z-10 pointer-events-none ${
                    earned ? style.cornerBorder : "border-slate-700"
                  }`}
                />
                <div
                  className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 z-10 pointer-events-none ${
                    earned ? style.cornerBorder : "border-slate-700"
                  }`}
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 z-10 pointer-events-none ${
                    earned ? style.cornerBorder : "border-slate-700"
                  }`}
                />

                <div
                  className={`relative bg-slate-950/80 border p-5 sm:p-6 ${
                    earned
                      ? `${style.cardBorder} ${style.cardGlow}`
                      : "border-slate-800/70"
                  } ${locked ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 text-center">
                      <p
                        className={`font-display font-bold text-6xl sm:text-7xl leading-none ${
                          earned
                            ? `${style.text} ${style.textClass} ${style.glow}`
                            : "text-slate-700"
                        }`}
                      >
                        {rank}
                      </p>
                      <p
                        className={`text-[9px] tracking-[0.3em] uppercase mt-2 ${
                          earned ? "text-slate-400" : "text-slate-700"
                        }`}
                      >
                        {style.flavor}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p
                          className={`font-display text-lg font-bold tracking-wider ${
                            earned ? "text-cyan-100" : "text-slate-500"
                          }`}
                        >
                          {style.title}
                        </p>
                        {isCurrent && (
                          <span
                            className={`text-[9px] tracking-[0.3em] uppercase px-1.5 py-0.5 border rounded-sm font-bold ${style.bg} ${style.border} ${style.text} ${style.textClass}`}
                          >
                            You are here
                          </span>
                        )}
                        {locked && (
                          <span className="text-[9px] tracking-[0.3em] uppercase px-1.5 py-0.5 border border-slate-700 text-slate-500 rounded-sm">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] tracking-widest uppercase mb-3 ${
                          earned ? "text-slate-500" : "text-slate-700"
                        }`}
                      >
                        Levels {firstLevel}
                        {!isLastRank ? `–${lastLevel}` : "+"} ·{" "}
                        {xpToReach.toLocaleString()} XP to reach
                      </p>
                      <p
                        className={`text-xs leading-relaxed ${
                          earned ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {style.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <p className="text-[10px] tracking-[0.3em] uppercase text-slate-600">
            Lv {stats.level} · {stats.totalXp.toLocaleString()} XP earned
          </p>
        </div>
      </div>
    </main>
  );
}
