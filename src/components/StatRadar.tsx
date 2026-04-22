"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTweenNumber } from "@/lib/useTweenNumber";

const DIMS = [
  { key: "body", label: "BODY", color: "#ef4444" },
  { key: "mind", label: "MIND", color: "#60a5fa" },
  { key: "emotion", label: "EMOTION", color: "#f472b6" },
  { key: "energy", label: "ENERGY", color: "#fbbf24" },
  { key: "spirit", label: "SPIRIT", color: "#a78bfa" },
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
  const containerRef = useRef<SVGSVGElement>(null);
  const [previous] = useState<Record<DimKey, number> | null>(() => readSnapshot());
  const [visible, setVisible] = useState(false);
  const savedRef = useRef(false);

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

  return (
    <svg
      ref={containerRef}
      viewBox="0 0 240 260"
      className="w-full max-w-[18rem] mx-auto"
      role="img"
      aria-label="Stat dimensions radar"
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
        <g key={i}>
          <text
            x={a.labelX}
            y={a.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.15em"
            fill={a.dim.color}
          >
            {a.dim.label}
          </text>
          <text
            x={a.labelX}
            y={a.labelY + 11}
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
  );
}