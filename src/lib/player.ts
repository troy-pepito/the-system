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

export const LEVEL_UP_EVENT = "system:level-up";

export function notifyLevelUp(detail: {
  from: number;
  to: number;
  /** True when this level-up also crossed a rank boundary, the toast
   *  uses this to suppress itself, since the rank-up celebration is
   *  the bigger moment and shouldn't be talked over. */
  alsoRankedUp: boolean;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LEVEL_UP_EVENT, { detail }));
}

export const REWARD_EVENT = "system:reward-granted";

export interface RewardDelta {
  xp?: number;
  body?: number;
  mind?: number;
  emotion?: number;
  energy?: number;
  spirit?: number;
  /**
   * Translation key for the source label, resolved at render time so
   * it follows the active locale. Prefer this over `source`.
   */
  sourceKey?: string;
  /** Placeholder values for `sourceKey`. */
  sourceValues?: Record<string, string | number>;
  /**
   * Legacy: pre-resolved source string. Only used when no `sourceKey`
   * was provided (dev-test panels, transient flavor strings).
   */
  source?: string;
}

export function notifyReward(delta: RewardDelta) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REWARD_EVENT, { detail: delta }));
}

export const CELEBRATION_EVENT = "system:celebration";

/** Distinct from {@link RewardDelta}: a "moment", the centered banner
 *  for perfect-day, full-clear, tier-crossing, combo-milestone. The
 *  small +XP pill from {@link notifyReward} still fires alongside this
 *  one (the regular gain log pattern), but the celebration owns the
 *  screen for ~2.6s. */
export interface CelebrationDetail {
  /** Bigger label, e.g. "PERFECT DAY", "FULL CLEAR", "RANK D". */
  titleKey: string;
  titleValues?: Record<string, string | number>;
  /** Optional smaller subtitle (dungeon name, day count). */
  subtitleKey?: string;
  subtitleValues?: Record<string, string | number>;
  xp: number;
  /** Drives the visual tint. Defaults to "amber". */
  tone?: "amber" | "cyan" | "violet" | "emerald";
}

export function notifyCelebration(detail: CelebrationDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CELEBRATION_EVENT, { detail }));
}

export const NOTICE_EVENT = "system:notice";

export interface SystemNotice {
  /** Bracket-text headline, keep short, all-caps friendly. */
  headline: string;
  /** Optional one-line body under the headline. */
  body?: string;
  /** Optional CTA, renders as a link styled like a System callout. */
  link?: { href: string; label: string };
}

/**
 * Player-facing System message, the in-world "[Quest Complete]"-flavored
 * announcement, distinct from the mechanical XP/dim toast (REWARD_EVENT).
 * Use sparingly: confirms that something the player did is now durable
 * and points them toward where it lives.
 */
export function notifySystemMessage(detail: SystemNotice) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail }));
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
