"use client";
import { useEffect, useState } from "react";
import { ATMOSPHERE_EVENT, getAtmosphereEnabled } from "@/lib/preferences";

export default function GrainOverlay() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getAtmosphereEnabled());
    const handler = () => setEnabled(getAtmosphereEnabled());
    window.addEventListener(ATMOSPHERE_EVENT, handler);
    return () => window.removeEventListener(ATMOSPHERE_EVENT, handler);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Film grain, smaller SVG, fractalNoise cached once */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] opacity-[0.045] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          backgroundRepeat: "repeat",
          animation: "grain-shift 8s steps(10) infinite",
        }}
      />
      {/* Scanlines with radial mask, static (drift removed; background-position animation caused repaints) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[199] opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(34,211,238,1) 0, rgba(34,211,238,1) 1px, transparent 1px, transparent 3px)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 75%)",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 75%)",
        }}
      />
      {/* Pulsing vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[198] animate-vignette-breathe"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(2,6,23,0.5) 95%)",
        }}
      />
    </>
  );
}