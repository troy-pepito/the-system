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

export default function StatRadar({ values }: StatRadarProps) {
  const cx = 120;
  const cy = 130;
  const r = 78;
  const max = Math.max(1, ...DIMS.map((d) => values[d.key]));

  const axes = DIMS.map((d, i) => {
    const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const scale = values[d.key] / max;
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

  const dataPoints = axes.map((a) => `${a.x},${a.y}`).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((s) =>
    DIMS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
      return `${cx + Math.cos(angle) * r * s},${cy + Math.sin(angle) * r * s}`;
    }).join(" ")
  );

  return (
    <svg
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
            {values[a.dim.key]}
          </text>
        </g>
      ))}
    </svg>
  );
}