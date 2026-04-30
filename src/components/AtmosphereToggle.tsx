"use client";
import { useEffect, useState } from "react";
import {
  ATMOSPHERE_EVENT,
  getAtmosphereEnabled,
  setAtmosphereEnabled,
} from "@/lib/preferences";

export default function AtmosphereToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getAtmosphereEnabled());
    const handler = () => setEnabled(getAtmosphereEnabled());
    window.addEventListener(ATMOSPHERE_EVENT, handler);
    return () => window.removeEventListener(ATMOSPHERE_EVENT, handler);
  }, []);

  function toggle() {
    setAtmosphereEnabled(!enabled);
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 uppercase tracking-wider">
          Atmosphere
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          Film grain, scanlines, and vignette. Disable for a cleaner, flatter view.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className={`shrink-0 relative w-14 h-7 rounded-full border transition-colors ${
          enabled
            ? "bg-cyan-500/25 border-cyan-400/60 shadow-[0_0_14px_rgba(34,211,238,0.4)]"
            : "bg-slate-900 border-slate-700"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all duration-200 ease-out ${
            enabled
              ? "left-[31px] bg-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              : "left-[3px] bg-slate-400"
          }`}
        />
      </button>
    </div>
  );
}
