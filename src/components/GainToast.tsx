"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { REWARD_EVENT, type RewardDelta } from "@/lib/player";

type Kind = "xp" | "body" | "mind" | "emotion" | "energy" | "spirit";

const KIND_ORDER: Kind[] = ["xp", "body", "mind", "emotion", "energy", "spirit"];

const STYLE: Record<Kind, string> = {
  xp: "text-cyan-200 border-cyan-400/60 bg-cyan-500/20 shadow-[0_0_16px_rgba(34,211,238,0.5)]",
  body: "text-emerald-200 border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_14px_rgba(52,211,153,0.5)]",
  mind: "text-cyan-200 border-cyan-400/60 bg-cyan-500/20 shadow-[0_0_14px_rgba(34,211,238,0.5)]",
  emotion: "text-rose-200 border-rose-400/60 bg-rose-500/20 shadow-[0_0_14px_rgba(251,113,133,0.5)]",
  energy: "text-amber-200 border-amber-400/60 bg-amber-500/20 shadow-[0_0_14px_rgba(251,191,36,0.5)]",
  spirit: "text-violet-200 border-violet-400/60 bg-violet-500/20 shadow-[0_0_14px_rgba(167,139,250,0.5)]",
};

interface Pill {
  id: number;
  kind: Kind;
  value: number;
}

let nextId = 1;

export default function GainToast() {
  const tDimensions = useTranslations("guide.dimensions");
  const [pills, setPills] = useState<Pill[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RewardDelta>).detail;
      if (!detail) return;

      const newPills: Pill[] = [];
      for (const kind of KIND_ORDER) {
        const v = detail[kind];
        if (typeof v === "number" && v > 0) {
          newPills.push({ id: nextId++, kind, value: v });
        }
      }
      if (newPills.length === 0) return;

      setPills((prev) => [...prev, ...newPills]);

      for (const p of newPills) {
        setTimeout(() => {
          setPills((prev) => prev.filter((x) => x.id !== p.id));
        }, 1800);
      }
    };

    window.addEventListener(REWARD_EVENT, handler);
    return () => window.removeEventListener(REWARD_EVENT, handler);
  }, []);

  if (pills.length === 0) return null;

  return (
    <div className="fixed right-4 top-[30vh] z-[150] pointer-events-none flex flex-col items-end gap-2">
      {pills.map((p) => (
        <div
          key={p.id}
          className={`font-mono font-bold px-3 py-1.5 border rounded text-sm tracking-[0.15em] uppercase animate-gain-pop ${STYLE[p.kind]}`}
        >
          +{p.value} {p.kind === "xp" ? "XP" : tDimensions(`${p.kind}.name`)}
        </div>
      ))}
    </div>
  );
}