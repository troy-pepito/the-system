import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * 512×512 app icon, designed to be maskable-safe for Android adaptive
 * icons. The OS crops up to 20% off each side into circle / square /
 * teardrop / squircle shapes, anything inside the inner 80% safe zone
 * survives. The previous version had a 16px cyan border at the edge
 * that got chopped off in the round / squircle masks.
 *
 * New layout: solid slate background fills the whole frame (no edge
 * border to lose), a cyan "S" centered inside the safe zone with its
 * own cyan ring at ~67% diameter, well within crop tolerance.
 */
export default function IconLarge() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
        }}
      >
        <div
          style={{
            width: 340,
            height: 340,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "12px solid #22d3ee",
            borderRadius: 64,
            color: "#22d3ee",
            fontSize: 240,
            fontWeight: 900,
            fontFamily: "sans-serif",
            letterSpacing: -8,
          }}
        >
          S
        </div>
      </div>
    ),
    size
  );
}