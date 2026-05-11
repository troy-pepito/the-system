"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTweenNumber } from "@/lib/useTweenNumber";

// Colors per element (Pancha Mahabhuta). Pulled from the same palette
// as DIM_STYLE in lib/dungeons.ts so the radar axes match the dungeon
// badges everywhere else in the app:
//   Earth   -> emerald-400 (grass / ground)
//   Air     -> slate-200   (silver-white; distinct from Water's blue)
//   Water   -> blue-400    (the obvious one)
//   Fire    -> amber-400   (flame)
//   Ether   -> violet-400  (void / transcendence)
// `aspect` is the legacy dimension name shown as a small secondary
// label so players who haven't internalized the elemental vocabulary
// yet can still see at a glance that Earth = body, Water = emotion,
// etc. Hardcoded here instead of i18n-keyed to keep the locale surface
// small per the project's incremental keying rule.
const DIMS = [
  { key: "body", color: "#34d399", aspect: "Body" }, // Earth, emerald
  { key: "mind", color: "#e2e8f0", aspect: "Mind" }, // Air, slate-200
  { key: "emotion", color: "#60a5fa", aspect: "Emotion" }, // Water, blue
  { key: "energy", color: "#fbbf24", aspect: "Energy" }, // Fire, amber
  { key: "spirit", color: "#a78bfa", aspect: "Spirit" }, // Ether, violet
] as const;

type DimKey = (typeof DIMS)[number]["key"];

interface StatRadarProps {
  values: Record<DimKey, number>;
}

const SNAPSHOT_KEY = "radar:last-snapshot";
const ZERO: Record<DimKey, number> = {
  body: 0,
  mind: 0,
  emotion: 0,
  energy: 0,
  spirit: 0,
};

function readSnapshot(): Record<DimKey, number> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.body === "number" &&
      typeof parsed?.mind === "number" &&
      typeof parsed?.emotion === "number" &&
      typeof parsed?.energy === "number" &&
      typeof parsed?.spirit === "number"
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

export default function StatRadar({ values }: StatRadarProps) {
  const tDimensions = useTranslations("guide.dimensions");
  const containerRef = useRef<SVGSVGElement>(null);
  const [previous] = useState<Record<DimKey, number> | null>(() => readSnapshot());
  const [visible, setVisible] = useState(false);
  const savedRef = useRef(false);
  // Click an axis label to expand its description. Helps onboard
  // players who haven't internalized the elemental vocabulary - the
  // description ties the element back to the real-world actions that
  // earn XP for it. Click the same axis again (or the close button)
  // to dismiss.
  const [selectedDim, setSelectedDim] = useState<DimKey | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Only save AFTER the radar has been visible long enough for the tween to settle.
  // Prevents capturing transient cache-vs-fetch mid-states.
  useEffect(() => {
    if (!visible || savedRef.current) return;
    const t = setTimeout(() => {
      if (savedRef.current) return;
      savedRef.current = true;
      try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(values));
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [visible, values]);

  // Target: before visible, hold at previous (or zero). After visible, move to current.
  // This makes the tween play "previous → current" on first visibility.
  const startingTarget = previous ?? ZERO;
  const target = visible ? values : startingTarget;

  const body = useTweenNumber(target.body, 1100);
  const mind = useTweenNumber(target.mind, 1100);
  const emotion = useTweenNumber(target.emotion, 1100);
  const energy = useTweenNumber(target.energy, 1100);
  const spirit = useTweenNumber(target.spirit, 1100);
  const tweened: Record<DimKey, number> = { body, mind, emotion, energy, spirit };

  const hasGrowth = useMemo(() => {
    if (!previous) return false;
    return DIMS.some((d) => values[d.key] !== previous[d.key]);
  }, [previous, values]);

  const cx = 120;
  const cy = 130;
  const r = 78;
  const max = Math.max(
    1,
    ...DIMS.map((d) => Math.max(values[d.key], previous?.[d.key] ?? 0))
  );

  const axes = DIMS.map((d, i) => {
    const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const scale = tweened[d.key] / max;
    return {
      dim: d,
      angle,
      x: cx + Math.cos(angle) * r * scale,
      y: cy + Math.sin(angle) * r * scale,
      axisX: cx + Math.cos(angle) * r,
      axisY: cy + Math.sin(angle) * r,
      labelX: cx + Math.cos(angle) * (r + 20),
      labelY: cy + Math.sin(angle) * (r + 20),
    };
  });

  const ghostPoints =
    previous && hasGrowth
      ? DIMS.map((d, i) => {
          const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
          const scale = previous[d.key] / max;
          return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
        }).join(" ")
      : "";

  const dataPoints = axes.map((a) => `${a.x},${a.y}`).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((s) =>
    DIMS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
      return `${cx + Math.cos(angle) * r * s},${cy + Math.sin(angle) * r * s}`;
    }).join(" ")
  );

  const selected = selectedDim ? DIMS.find((d) => d.key === selectedDim) : null;

  return (
    <div className="flex flex-col items-center gap-4">
    <svg
      ref={containerRef}
      viewBox="0 0 240 280"
      className="w-full max-w-[18rem] mx-auto"
      role="img"
      aria-label="Stat dimensions radar. Tap an axis label to learn what that element trains."
    >
      {rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="rgba(100, 116, 139, 0.25)"
          strokeWidth="1"
        />
      ))}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.axisX}
          y2={a.axisY}
          stroke="rgba(100, 116, 139, 0.25)"
          strokeWidth="1"
        />
      ))}
      {ghostPoints && (
        <polygon
          points={ghostPoints}
          fill="rgba(148, 163, 184, 0.08)"
          stroke="rgba(148, 163, 184, 0.45)"
          strokeWidth="1"
          strokeDasharray="3 3"
          strokeLinejoin="round"
        />
      )}
      <polygon
        points={dataPoints}
        fill="rgba(34, 211, 238, 0.22)"
        stroke="rgb(34, 211, 238)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {axes.map((a, i) => (
        <circle key={i} cx={a.x} cy={a.y} r={3} fill={a.dim.color} />
      ))}
      {axes.map((a, i) => (
        <g
          key={i}
          onClick={() =>
            setSelectedDim((current) =>
              current === a.dim.key ? null : a.dim.key
            )
          }
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`Reveal ${a.dim.aspect} element description`}
        >
          {/* Slightly larger transparent hit target around the axis
              labels so taps don't have to land pixel-perfect. */}
          <rect
            x={a.labelX - 24}
            y={a.labelY - 14}
            width="48"
            height="32"
            fill="transparent"
          />
          {/* Element name (e.g. EARTH) in element color */}
          <text
            x={a.labelX}
            y={a.labelY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.15em"
            fill={a.dim.color}
            style={{
              filter:
                selectedDim === a.dim.key
                  ? `drop-shadow(0 0 6px ${a.dim.color})`
                  : undefined,
            }}
          >
            {tDimensions(`${a.dim.key}.name`)}
          </text>
          {/* Aspect name (e.g. Body) in dim slate, ties the element
              vocabulary back to the original body/mind framing for
              new players. */}
          <text
            x={a.labelX}
            y={a.labelY + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="6.5"
            letterSpacing="0.18em"
            fill="rgb(100, 116, 139)"
          >
            {a.dim.aspect.toUpperCase()}
          </text>
          {/* Numeric value in mono */}
          <text
            x={a.labelX}
            y={a.labelY + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fill="rgb(148, 163, 184)"
          >
            {Math.round(tweened[a.dim.key])}
          </text>
        </g>
      ))}
    </svg>
    {selected && (
      <div
        className="w-full max-w-[20rem] relative bg-slate-900/70 border rounded-lg p-4 pr-9 animate-fade-in"
        style={{ borderColor: `${selected.color}66` }}
      >
        <button
          type="button"
          onClick={() => setSelectedDim(null)}
          aria-label="Close element description"
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-200 text-base leading-none"
        >
          ×
        </button>
        <div className="flex items-baseline gap-2 mb-2">
          <span
            className="text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: selected.color }}
          >
            {tDimensions(`${selected.key}.name`)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {selected.aspect}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {tDimensions(`${selected.key}.description`)}
        </p>
      </div>
    )}
    </div>
  );
}