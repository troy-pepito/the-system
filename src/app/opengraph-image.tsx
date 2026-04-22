import { ImageResponse } from "next/og";

export const alt = "Shivaliva Leveling — Face your shadows. Rank up in real life.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at top, #0c2a3d 0%, #020617 60%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(34,211,238,0.05) 3px, rgba(34,211,238,0.05) 4px)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 20,
            letterSpacing: 12,
            color: "#67e8f9",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          [ Shivaliva Leveling ]
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 88,
            fontWeight: 900,
            color: "#cffafe",
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex" }}>Face your shadows.</div>
          <div style={{ display: "flex" }}>Rank up in real life.</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#94a3b8",
            marginTop: 48,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          A gamified self-improvement system for the battles nobody&apos;s watching.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 18,
            letterSpacing: 6,
            color: "#fbbf24",
            textTransform: "uppercase",
          }}
        >
          <span>E</span>
          <span style={{ color: "#475569" }}>→</span>
          <span>D</span>
          <span style={{ color: "#475569" }}>→</span>
          <span>C</span>
          <span style={{ color: "#475569" }}>→</span>
          <span>B</span>
          <span style={{ color: "#475569" }}>→</span>
          <span>A</span>
          <span style={{ color: "#475569" }}>→</span>
          <span style={{ color: "#fde047" }}>S</span>
        </div>
      </div>
    ),
    size
  );
}