"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
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

type RelativeT = (key: string, values?: Record<string, string | number>) => string;

function relativeTime(ts: number, t: RelativeT): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t("justNow");
  if (min < 60) return t("minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  return t("daysAgo", { count: day });
}

export default function RecentGains() {
  const t = useTranslations("recentGains");
  const tDimensions = useTranslations("guide.dimensions");
  const gains = useGains();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (gains.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-3">
          {t("title")}
        </p>
        <p className="text-xs text-slate-500 italic leading-relaxed">
          {t("empty")}
        </p>
      </Card>
    );
  }

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Card className="p-6">
      <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
        {t("title")}
      </p>
      <ul className="space-y-2">
        {gains.map((g, i) => {
          const key = `${g.ts}-${i}`;
          const isOpen = expanded.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                className={`w-full flex gap-3 text-xs border border-slate-800/60 bg-slate-950/40 rounded px-3 py-2 text-left hover:border-cyan-500/40 hover:bg-slate-900/40 transition-colors ${
                  isOpen
                    ? "flex-col items-stretch"
                    : "items-start justify-between"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-slate-200 tracking-wider ${
                      isOpen ? "whitespace-normal break-words" : "truncate"
                    }`}
                  >
                    {g.source}
                  </p>
                  <p className="text-[9px] text-slate-600 tracking-widest uppercase mt-0.5">
                    {relativeTime(g.ts, t)}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1.5 flex-wrap ${
                    isOpen ? "justify-start" : "justify-end shrink-0"
                  }`}
                >
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
                        {v} {tDimensions(`${k}.name`)}
                      </span>
                    );
                  })}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
