import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          border: "6px solid #22d3ee",
          borderRadius: 36,
          color: "#22d3ee",
          fontSize: 120,
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: -4,
        }}
      >
        S
      </div>
    ),
    size
  );
}