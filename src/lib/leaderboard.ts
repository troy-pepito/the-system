/**
 * Weighted activity-points table for the weekly leaderboard.
 *
 * Each completed action this week contributes to a player's "activity
 * points" total, the metric the Duolingo-style leaderboard ranks on.
 * Weights are pinned to real-world difficulty in the Shivaliva brand:
 * exposure therapy (genuine IRL social anxiety overcome) is worth 3×
 * a daily quest tick, so the hunters doing the hardest things get the
 * loudest signal on the board.
 *
 * Decision: count actions, NOT XP. XP varies wildly with tier bonuses,
 * combo multipliers, and claimed trophies, so XP-earned-this-week
 * would let veterans rack up 10× more for the same effort as a new
 * hunter, unfair scoring. Action counts equalize the playing field
 * and reward consistency.
 */
export const ACTIVITY_POINTS = {
  /** Each ticked daily quest. */
  dailyQuest: 1,
  /** Each cleared calendar day in continuous-streak / timed dungeons. */
  dayCleared: 1,
  /** Each side quest tick (rare, intentional, weekly-ish). */
  sideQuest: 2,
  /** Each logged workout in cadence dungeons. Deduped by (type, date). */
  workout: 2,
  /** Each cadence-window where every required workout type was logged. */
  cadenceFullClear: 2,
  /** Each exposure logged in a progressive ladder (hardest IRL action). */
  exposure: 3,
  /** Each calendar day where every daily quest was completed. */
  perfectDay: 3,
} as const;
