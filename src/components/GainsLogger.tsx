"use client";
import { useEffect } from "react";
import { REWARD_EVENT, type RewardDelta } from "@/lib/player";
import { appendGain } from "@/lib/gainsLog";

export default function GainsLogger() {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RewardDelta>).detail;
      if (!detail) return;
      const hasAnything =
        (detail.xp ?? 0) !== 0 ||
        (detail.body ?? 0) !== 0 ||
        (detail.mind ?? 0) !== 0 ||
        (detail.emotion ?? 0) !== 0 ||
        (detail.energy ?? 0) !== 0 ||
        (detail.spirit ?? 0) !== 0;
      if (!hasAnything) return;
      appendGain({
        ts: Date.now(),
        sourceKey: detail.sourceKey,
        sourceValues: detail.sourceValues,
        source: detail.sourceKey ? undefined : (detail.source ?? "Gain"),
        xp: detail.xp,
        body: detail.body,
        mind: detail.mind,
        emotion: detail.emotion,
        energy: detail.energy,
        spirit: detail.spirit,
      });
    };
    window.addEventListener(REWARD_EVENT, handler);
    return () => window.removeEventListener(REWARD_EVENT, handler);
  }, []);

  return null;
}
