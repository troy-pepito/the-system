const RANKS = ["E", "D", "C", "B", "A", "S"];
const BASE_XP = 100;
const LEVELS_PER_RANK = 10;
export const XP_PER_STREAK_DAY = 10;
export const XP_PER_WORKOUT = 25;
export const XP_PER_EXPOSURE = 20;
export const XP_PER_COMPLETION = 500;

export function getXpForLevel(level: number): number {
  return Math.floor(BASE_XP * Math.pow(level, 1.5));
}

export function getLevelFromXp(totalXp: number): {
  level: number;
  currentXp: number;
  xpToNext: number;
} {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= getXpForLevel(level)) {
    remaining -= getXpForLevel(level);
    level++;
  }
  return { level, currentXp: remaining, xpToNext: getXpForLevel(level) };
}

export function getRank(level: number): string {
  const rankIndex = Math.min(
    Math.floor((level - 1) / LEVELS_PER_RANK),
    RANKS.length - 1
  );
  return RANKS[rankIndex];
}

export const STATS_UPDATED_EVENT = "system:stats-updated";

export function notifyStatsUpdated(detail?: { xpDelta?: number }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STATS_UPDATED_EVENT, { detail }));
  }
}

export const RANK_UP_EVENT = "system:rank-up";

export function notifyRankUp(detail: { from: string; to: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RANK_UP_EVENT, { detail }));
}

export const REWARD_EVENT = "system:reward-granted";

export interface RewardDelta {
  xp?: number;
  body?: number;
  mind?: number;
  emotion?: number;
  energy?: number;
  spirit?: number;
}

export function notifyReward(delta: RewardDelta) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REWARD_EVENT, { detail: delta }));
}

let pendingMutations = 0;

export function beginMutation() {
  pendingMutations++;
}

export function endMutation() {
  pendingMutations = Math.max(0, pendingMutations - 1);
  if (pendingMutations === 0) notifyStatsUpdated();
}

export function hasPendingMutations() {
  return pendingMutations > 0;
}

export function computeStreakDays(streakStart: string | null): number {
  if (!streakStart) return 0;
  return Math.floor(
    (Date.now() - new Date(streakStart).getTime()) / (1000 * 60 * 60 * 24)
  );
}
