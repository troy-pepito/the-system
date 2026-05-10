"use client";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

interface HeatmapProps {
  activity: Record<string, number>;
}

const WEEKS = 8;
const CELL = 14;
const GAP = 4;

const LEVEL_CLASSES = [
  "bg-slate-800 border border-slate-700/60",
  "bg-cyan-900 border border-cyan-800",
  "bg-cyan-700 border border-cyan-600",
  "bg-cyan-500 border border-cyan-400",
  "bg-cyan-300 border border-cyan-200",
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export default function Heatmap({ activity }: HeatmapProps) {
  const t = useTranslations("heatmap");
  const locale = useLocale();

  // Locale-aware month abbreviations + weekday short labels. We pin
  // month names to a stable date set so re-renders during the same
  // locale return identical strings (no flickering).
  const months = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, m) =>
      fmt.format(new Date(Date.UTC(2024, m, 15)))
    );
  }, [locale]);

  // Sunday=0, Monday=1, ..., Saturday=6. Heatmap labels rows 1, 3, 5
  // (Mon / Wed / Fri); the rest are blank to reduce visual noise.
  const dayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      if (i === 1 || i === 3 || i === 5) {
        // Reference: Sun Jan 7 2024 = day 0; +i steps to that weekday.
        out.push(fmt.format(new Date(Date.UTC(2024, 0, 7 + i))));
      } else {
        out.push("");
      }
    }
    return out;
  }, [locale]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDow = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - (WEEKS - 1) * 7 - todayDow);

  const columns: Array<Array<{ date: Date; count: number; future: boolean }>> = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: Array<{ date: Date; count: number; future: boolean }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const future = date.getTime() > today.getTime();
      const count = future ? 0 : activity[dateKey(date)] ?? 0;
      col.push({ date, count, future });
    }
    columns.push(col);
  }

  const monthLabels = columns.map((col, i) => {
    const m = col[0].date.getMonth();
    if (i === 0) return months[m];
    return columns[i - 1][0].date.getMonth() !== m ? months[m] : null;
  });

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <div className="inline-flex flex-col gap-1">
          <div
            className="flex"
            style={{ gap: GAP, marginLeft: 28, height: 12 }}
          >
            {monthLabels.map((lbl, i) => (
              <div
                key={i}
                style={{ width: CELL }}
                className="shrink-0 text-[9px] text-slate-500 tracking-wider overflow-visible whitespace-nowrap"
              >
                {lbl ?? ""}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            <div
              className="flex flex-col shrink-0"
              style={{ gap: GAP, width: 24 }}
            >
              {dayLabels.map((lbl, i) => (
                <div
                  key={i}
                  style={{ height: CELL }}
                  className="flex items-center text-[9px] text-slate-500 tracking-wider"
                >
                  {lbl}
                </div>
              ))}
            </div>

            {columns.map((col, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {col.map((cell, ri) => {
                  const isToday =
                    !cell.future && cell.date.getTime() === today.getTime();
                  const color = cell.future
                    ? "bg-transparent border border-transparent"
                    : LEVEL_CLASSES[levelFor(cell.count)];
                  return (
                    <div
                      key={ri}
                      title={
                        cell.future ? "" : `${dateKey(cell.date)}, ${cell.count}`
                      }
                      style={{ width: CELL, height: CELL }}
                      className={`shrink-0 rounded-[3px] ${color} ${
                        isToday
                          ? "ring-1 ring-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                          : ""
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-4 justify-center select-none pointer-events-none">
        <span className="text-[9px] text-slate-600 tracking-wider mr-1">{t("less")}</span>
        {LEVEL_CLASSES.map((c, i) => (
          <div
            key={i}
            style={{ width: 10, height: 10 }}
            className={`shrink-0 rounded-[2px] ${c}`}
          />
        ))}
        <span className="text-[9px] text-slate-600 tracking-wider ml-1">{t("more")}</span>
      </div>
    </div>
  );
}