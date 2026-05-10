"use client";
import { useState } from "react";
import {
  notifyRankUp,
  notifyLevelUp,
  notifyReward,
  notifyStatsUpdated,
} from "@/lib/player";
import { sendTestPush } from "@/app/actions/push";
import { fireRankUpSharePrompt } from "@/lib/rankUpShareEvent";
import { COMBO_MILESTONES } from "@/lib/quests";
import { TIER_BONUS_XP } from "@/lib/dungeons";

const TIER_RANKS = ["E", "D", "C", "B", "A", "S"];

const RANKS = ["E", "D", "C", "B", "A", "S"];

export default function DevTestPanel() {
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  function fireRankUp() {
    const fromIdx = Math.floor(Math.random() * (RANKS.length - 1));
    notifyRankUp({ from: RANKS[fromIdx], to: RANKS[fromIdx + 1] });
  }

  function fireSharePrompt() {
    const fromIdx = Math.floor(Math.random() * (RANKS.length - 1));
    fireRankUpSharePrompt({
      from: RANKS[fromIdx],
      to: RANKS[fromIdx + 1],
    });
  }

  function fireComboCelebration() {
    // Pick a random milestone so successive clicks cycle through tiers.
    const milestone =
      COMBO_MILESTONES[Math.floor(Math.random() * COMBO_MILESTONES.length)];
    notifyReward({
      xp: milestone.xp,
      source: `🔥 ${milestone.days}-Day Combo`,
    });
    notifyStatsUpdated({ xpDelta: milestone.xp });
  }

  function fireTierCelebration() {
    const idx = Math.floor(Math.random() * TIER_RANKS.length);
    const rank = TIER_RANKS[idx];
    const bonus = TIER_BONUS_XP[idx] ?? 0;
    notifyReward({
      xp: bonus,
      source: `🏆 Rank ${rank} · NoFap`,
    });
    notifyStatsUpdated({ xpDelta: bonus });
  }

  function fireLevel() {
    const to = 2 + Math.floor(Math.random() * 49);
    notifyLevelUp({ from: to - 1, to, alsoRankedUp: false });
  }

  function fireGain() {
    notifyReward({
      xp: 25,
      body: 2,
      mind: 1,
      energy: 1,
    });
  }

  async function firePush() {
    setPushStatus("sending…");
    try {
      const result = await sendTestPush();
      if (result.sent === 0) {
        setPushStatus("0 devices, subscribe first");
      } else {
        setPushStatus(`sent → ${result.sent} device${result.sent === 1 ? "" : "s"}`);
      }
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : "failed");
    }
    setTimeout(() => setPushStatus(null), 3500);
  }

  return (
    <div className="fixed bottom-4 left-4 z-[250] flex flex-col gap-2 font-mono">
      <p className="text-[9px] tracking-[0.3em] uppercase text-rose-400/80">
        [ Dev ]
      </p>
      <button
        onClick={fireRankUp}
        className="px-3 py-1.5 bg-rose-500/15 border border-rose-400/50 text-rose-200 text-[10px] uppercase tracking-[0.25em] hover:bg-rose-500/25 transition-colors"
      >
        ⚡ Rank Glitch
      </button>
      <button
        onClick={fireGain}
        className="px-3 py-1.5 bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 text-[10px] uppercase tracking-[0.25em] hover:bg-cyan-500/25 transition-colors"
      >
        + Gain Pop
      </button>
      <button
        onClick={fireSharePrompt}
        className="px-3 py-1.5 bg-amber-500/15 border border-amber-400/50 text-amber-200 text-[10px] uppercase tracking-[0.25em] hover:bg-amber-500/25 transition-colors"
      >
        ★ Share Prompt
      </button>
      <button
        onClick={fireComboCelebration}
        className="px-3 py-1.5 bg-orange-500/15 border border-orange-400/50 text-orange-200 text-[10px] uppercase tracking-[0.25em] hover:bg-orange-500/25 transition-colors"
      >
        🔥 Combo Pop
      </button>
      <button
        onClick={fireTierCelebration}
        className="px-3 py-1.5 bg-yellow-500/15 border border-yellow-400/50 text-yellow-200 text-[10px] uppercase tracking-[0.25em] hover:bg-yellow-500/25 transition-colors"
      >
        🏆 Tier Pop
      </button>
      <button
        onClick={fireLevel}
        className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-[10px] uppercase tracking-[0.25em] hover:bg-emerald-500/25 transition-colors"
      >
        ↑ Level Pop
      </button>
      <button
        onClick={firePush}
        className="px-3 py-1.5 bg-amber-500/15 border border-amber-400/50 text-amber-200 text-[10px] uppercase tracking-[0.25em] hover:bg-amber-500/25 transition-colors"
      >
        🧪 Test Push
      </button>
      {pushStatus && (
        <p className="text-[9px] tracking-widest text-amber-300/80">
          {pushStatus}
        </p>
      )}
    </div>
  );
}
