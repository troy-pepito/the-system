"use client";
import Card from "@/components/Card";
import { useGains, type GainEntry } from "@/lib/gainsLog";
import { DIM_STYLE } from "@/lib/dungeons";

const DIM_KEYS: Array<keyof GainEntry & ("body" | "mind" | "emotion" | "energy" | "spirit")> = [
  "body",
  "mind",
  "emotion",
  "energy",
  "spirit",
];

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function RecentGains() {
  const gains = useGains();
  if (gains.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-3">
          Recent Gains
        </p>
        <p className="text-xs text-slate-500 italic leading-relaxed">
          Your gain log appears here as you complete quests, clear days, and
          claim victories.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
        Recent Gains
      </p>
      <ul className="space-y-2">
        {gains.map((g, i) => (
          <li
            key={`${g.ts}-${i}`}
            className="flex items-start justify-between gap-3 text-xs border border-slate-800/60 bg-slate-950/40 rounded px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 truncate tracking-wider">
                {g.source}
              </p>
              <p className="text-[9px] text-slate-600 tracking-widest uppercase mt-0.5">
                {relativeTime(g.ts)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
              {typeof g.xp === "number" && g.xp !== 0 && (
                <span className="text-cyan-300 font-mono drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
                  {g.xp > 0 ? "+" : ""}
                  {g.xp} XP
                </span>
              )}
              {DIM_KEYS.map((k) => {
                const v = g[k];
                if (typeof v !== "number" || v === 0) return null;
                return (
                  <span
                    key={k}
                    className={`text-[9px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm ${DIM_STYLE[k]}`}
                  >
                    {v > 0 ? "+" : ""}
                    {v} {k}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
