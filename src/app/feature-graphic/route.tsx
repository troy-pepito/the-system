import { ImageResponse } from "next/og";

/**
 * Play Store feature graphic, 1024x500. Visit
 * https://shivalivaleveling.com/feature-graphic and right-click → Save
 * to grab a PNG for upload to Play Console → Main store listing →
 * Feature graphic. Mirrors the OG image aesthetic (dark slate, cyan +
 * amber rank chrome) but compressed for the shorter 500px height and
 * with PLAYSTORE.md's "Face Your Shadows / Rank Up In Real Life"
 * headline instead of the OG's "Real life is the dungeon".
 */
export const dynamic = "force-static";

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
            "radial-gradient(ellipse at top, #0c2a3d 0%, #020617 65%)",
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
            fontSize: 18,
            letterSpacing: 10,
            color: "#67e8f9",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          [ Shivaliva Leveling ]
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontWeight: 900,
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 76,
              color: "#cffafe",
            }}
          >
            Face Your Shadows.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              color: "#fbbf24",
              marginTop: 4,
            }}
          >
            Rank Up In Real Life.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 16,
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
    { width: 1024, height: 500 }
  );
}
