"use client";
import { useEffect, useState, useTransition } from "react";
import {
  HUNTER_TYPE_LIST,
  type HunterType,
} from "@/lib/hunterType";
import { getHunterType, setHunterType } from "@/app/actions/hunterType";

export default function HunterTypePicker() {
  const [current, setCurrent] = useState<HunterType | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getHunterType()
      .then((t) => {
        if (!cancelled) {
          setCurrent(t);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function pick(next: HunterType | null) {
    if (pending) return;
    if (next === current) {
      // Tapping the active card unsets — revert to Unaffiliated.
      next = null;
    }
    const optimistic = next;
    setCurrent(optimistic);
    startTransition(async () => {
      try {
        await setHunterType(optimistic);
      } catch {
        // Roll back if the server rejected.
        setCurrent(current);
      }
    });
  }

  if (!loaded) {
    return (
      <p className="text-xs text-slate-500 leading-relaxed">
        Reading your path…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 leading-relaxed">
        Pick a path to unlock its training programs. Tap your selected
        path again to revert to Unaffiliated. Switching is free — explore.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {HUNTER_TYPE_LIST.map((t) => {
          const active = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              disabled={pending}
              aria-pressed={active}
              className={`relative text-left p-3 border rounded-lg transition-all disabled:opacity-50 ${
                active
                  ? `${t.badgeStyle} ${t.glow}`
                  : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold uppercase tracking-wider">
                  {t.label}
                </p>
                {active && (
                  <span className="text-[9px] tracking-[0.3em] uppercase opacity-80">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] italic opacity-80 mb-1.5">
                {t.tagline}
              </p>
              <p
                className={`text-[11px] leading-relaxed ${
                  active ? "" : "text-slate-500"
                }`}
              >
                {t.description}
              </p>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-600 italic">
        Training programs land in the next phase — picking a path now reserves
        your identity, the daily routines follow.
      </p>
    </div>
  );
}
