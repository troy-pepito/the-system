"use client";
import { useEffect, useState } from "react";

const KEY = "system:force-ekadashi";
const EVENT = "system:force-ekadashi-changed";

export function isForceEkadashi(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "true";
}

export default function SideQuestDebugToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isForceEkadashi());
    const onChange = () => setEnabled(isForceEkadashi());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function toggle() {
    const next = !enabled;
    if (next) {
      localStorage.setItem(KEY, "true");
    } else {
      localStorage.removeItem(KEY);
    }
    window.dispatchEvent(new Event(EVENT));
    setEnabled(next);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 uppercase tracking-wider">
            Force Side Quest <span className="text-rose-400/80 text-[10px] tracking-widest ml-1">[ Debug ]</span>
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Pretend today is an Ekadashi so the side-quest card appears on
            your status page. Used for testing only.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          className={`shrink-0 relative w-14 h-7 rounded-full border transition-colors ${
            enabled
              ? "bg-rose-500/25 border-rose-400/60 shadow-[0_0_14px_rgba(244,63,94,0.4)]"
              : "bg-slate-900 border-slate-700"
          }`}
        >
          <span
            className={`absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all duration-200 ease-out ${
              enabled
                ? "left-[31px] bg-rose-100 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                : "left-[3px] bg-slate-400"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
