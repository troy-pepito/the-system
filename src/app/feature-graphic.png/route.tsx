import { ImageResponse } from "next/og";

// Play Store feature graphic: 1024 x 500, JPEG or 24-bit PNG, no
// transparency. This route renders a pixel-perfect version on demand
// at /feature-graphic.png, iterate in JSX instead of Photoshop. To
// export: visit the URL, right-click, save as. To regenerate after
// copy or color tweaks: just refresh the URL.

export const runtime = "edge";

const SIZE = { width: 1024, height: 500 };

export async function GET() {
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
            "radial-gradient(ellipse at top left, #0c2a3d 0%, #020617 65%)",
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
              "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(34,211,238,0.06) 3px, rgba(34,211,238,0.06) 4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 32,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            letterSpacing: 8,
            color: "#67e8f9",
            textTransform: "uppercase",
          }}
        >
          <span>[</span>
          <span>Shivaliva Leveling</span>
          <span>]</span>
        </div>
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            display: "flex",
            fontSize: 11,
            letterSpacing: 4,
            color: "#fbbf24",
            textTransform: "uppercase",
            border: "1px solid rgba(251,191,36,0.5)",
            padding: "4px 10px",
          }}
        >
          100% Free
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 64,
            fontWeight: 900,
            color: "#cffafe",
            lineHeight: 1.05,
            textAlign: "center",
            marginTop: 28,
          }}
        >
          <div style={{ display: "flex" }}>Real life is the dungeon.</div>
          <div style={{ display: "flex" }}>Show up anyway.</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#94a3b8",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Gamified self-improvement app for the battles nobody&apos;s watching.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 16,
            letterSpacing: 5,
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
    SIZE
  );
}
