import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          border: "16px solid #22d3ee",
          borderRadius: 96,
          color: "#22d3ee",
          fontSize: 340,
          fontWeight: 900,
          fontFamily: "sans-serif",
          letterSpacing: -12,
        }}
      >
        S
      </div>
    ),
    size
  );
}