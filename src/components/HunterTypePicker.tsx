"use client";
import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  HUNTER_TYPE_LIST,
  isHunterType,
  type HunterType,
} from "@/lib/hunterType";

export default function HunterTypePicker() {
  const tHunterTypes = useTranslations("hunterTypes");
  const tPicker = useTranslations("hunterTypePicker");
  const { user, isLoaded } = useUser();
  const meta = user?.unsafeMetadata as { hunterType?: unknown } | undefined;
  const persisted: HunterType | null =
    typeof meta?.hunterType === "string" && isHunterType(meta.hunterType)
      ? meta.hunterType
      : null;

  const [optimistic, setOptimistic] = useState<HunterType | null>(null);
  const [pending, startTransition] = useTransition();

  // Optimistic value wins while a transition is in flight, otherwise
  // we trust the live Clerk state. This way picking a type updates
  // the active card instantly even before the API call settles.
  const current = pending ? optimistic : persisted;

  function pick(next: HunterType | null) {
    if (!user || pending) return;
    // Tap the active card again to revert to Unaffiliated.
    const target = next === persisted ? null : next;
    setOptimistic(target);
    startTransition(async () => {
      try {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata ?? {}),
            hunterType: target,
          },
        });
      } catch {
        // useUser() will surface the persisted value on next render.
      }
    });
  }

  if (!isLoaded || !user) {
    return (
      <p className="text-xs text-slate-500 leading-relaxed">
        {tPicker("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-300 leading-relaxed">
        {tPicker("intro")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {HUNTER_TYPE_LIST.map((def) => {
          const active = current === def.id;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => pick(def.id)}
              disabled={pending}
              aria-pressed={active}
              className={`relative text-left p-3 border rounded-lg transition-all disabled:opacity-50 ${
                active
                  ? `${def.badgeStyle} ${def.glow}`
                  : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold uppercase tracking-wider">
                  {tHunterTypes(`${def.id}.label`)}
                </p>
                {active && (
                  <span className="text-[9px] tracking-[0.3em] uppercase opacity-80">
                    {tPicker("active")}
                  </span>
                )}
              </div>
              <p className="text-[11px] italic opacity-80 mb-1.5">
                {tHunterTypes(`${def.id}.tagline`)}
              </p>
              <p
                className={`text-[11px] leading-relaxed ${
                  active ? "" : "text-slate-500"
                }`}
              >
                {tHunterTypes(`${def.id}.description`)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
