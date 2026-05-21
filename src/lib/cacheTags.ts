/**
 * Cache tag helpers. Granular per-user tags let one user's mutation
 * invalidate only their own cached snapshot — without these, every
 * tap by anyone in the system busts the cache for every user, which
 * turns the leaderboard (and any /h/[hunterId] hit) into a cold-cache
 * rebuild for ~N users every time.
 *
 * Keep this file dependency-free so it can be imported from both
 * server actions and any future server-component data layer.
 */

const PLAYER_STATS_PREFIX = "player:stats";

/** Per-user player-stats tag, scopes cache invalidation to the acting
 *  user. Use as both the tag on per-user `unstable_cache` entries AND
 *  the argument to `updateTag` after a mutation. */
export function playerStatsTag(userId: string): string {
  return `${PLAYER_STATS_PREFIX}:${userId}`;
}

/** Tag for the global "who has ever touched the system" list, used by
 *  the leaderboard's global scope. Invalidated only when a brand-new
 *  user appears in the pool, not on every action. */
export const GLOBAL_HUNTERS_TAG = "global-hunters";
