"use client";

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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

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
    if (i === 0) return MONTHS[m];
    return columns[i - 1][0].date.getMonth() !== m ? MONTHS[m] : null;
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
              {DAY_LABELS.map((lbl, i) => (
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
                        cell.future ? "" : `${dateKey(cell.date)} — ${cell.count}`
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
        <span className="text-[9px] text-slate-600 tracking-wider mr-1">less</span>
        {LEVEL_CLASSES.map((c, i) => (
          <div
            key={i}
            style={{ width: 10, height: 10 }}
            className={`shrink-0 rounded-[2px] ${c}`}
          />
        ))}
        <span className="text-[9px] text-slate-600 tracking-wider ml-1">more</span>
      </div>
    </div>
  );
}