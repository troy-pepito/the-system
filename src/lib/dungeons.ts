import type { HunterType } from "@/lib/hunterType";

export interface DungeonTier {
  rank: string;
  days: number;
}

export type DungeonRuleType =
  | "continuous_streak"
  | "cadence"
  | "timed"
  | "progressive"
  | "training_program";

/**
 * Each tier in a training program lifts the daily rep target. `days` is
 * the cumulative cleared-day threshold to *earn* this rank — same
 * convention as the existing tier ladders. While cleared days < the
 * earned tier's threshold, the player is grinding toward the next
 * tier and the daily target equals that next tier's reps.
 */
export interface TrainingProgramTier {
  rank: string;
  reps: number;
  days: number;
}

export interface TrainingProgramConfig {
  /** Singular noun for the unit — "pushup", "minute", "second". */
  unit: string;
  /** Plural form. */
  unitPlural: string;
  /** Verb shown on the log button — "Log pushups", "Log minutes". */
  actionVerb: string;
  tiers: TrainingProgramTier[];
}

export interface TimedConfig {
  targetDays: number;
}

export interface WorkoutType {
  id: string;
  name: string;
}

export interface CadenceConfig {
  weeklyTarget: number;
  window: "week";
  workouts: WorkoutType[];
}

export interface Rung {
  id: string;
  name: string;
  rank: string;
  target: number;
  description: string;
}

export interface ProgressiveConfig {
  rungs: Rung[];
}


export interface DungeonDimensions {
  body?: number;
  mind?: number;
  emotion?: number;
  energy?: number;
  spirit?: number;
}

export interface DungeonDef {
  id: string;
  name: string;
  rank: string;
  ruleType: DungeonRuleType;
  tiers?: DungeonTier[];
  description: string;
  timed?: TimedConfig;
  cadence?: CadenceConfig;
  progressive?: ProgressiveConfig;
  trainingProgram?: TrainingProgramConfig;
  /** Hunter Type gate — only players matching this type can enter. */
  hunterType?: HunterType;
  rules?: string[];
  dimensions?: DungeonDimensions;
}

// Multipliers for rank-cleared dimension rewards (E, D, C, B, A, S).
// Each rank cleared adds base × multiplier to the mapped dimensions.
export const DIMENSION_RANK_MULTIPLIERS = [1, 2, 4, 8, 16, 32];

// One-time XP bonus credited the moment a player crosses a dungeon tier
// (E → D → ... → S). Cumulative across tiers — reaching S earns the full
// 100 + 200 + 400 + 800 + 1600 + 3200 = 6300 XP from that dungeon's
// tier ladder alone.
export const TIER_BONUS_XP = [100, 200, 400, 800, 1600, 3200];

// Per-action scaling bonus added on top of the base XP rate, indexed by
// the highest tier the player has cleared in that dungeon. Caps at +30
// at S rank — this is the system's hard ceiling on per-action XP.
export const TIER_PER_ACTION_BONUS = [5, 10, 15, 20, 25, 30];

export const DIM_ORDER = ["body", "mind", "emotion", "energy", "spirit"] as const;
export type DimKey = (typeof DIM_ORDER)[number];

export const DIM_STYLE: Record<DimKey, string> = {
  body: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  mind: "text-cyan-300 border-cyan-400/40 bg-cyan-500/10",
  emotion: "text-rose-300 border-rose-400/40 bg-rose-500/10",
  energy: "text-amber-300 border-amber-400/40 bg-amber-500/10",
  spirit: "text-violet-300 border-violet-400/40 bg-violet-500/10",
};

export function dungeonDims(d: DungeonDef): DimKey[] {
  if (!d.dimensions) return [];
  return DIM_ORDER.filter((k) => (d.dimensions?.[k] ?? 0) > 0);
}

export const SOCIAL_RECLAIM_RUNGS: Rung[] = [
  {
    id: "presence",
    name: "Presence",
    rank: "E",
    target: 5,
    description:
      "Hold eye contact and smile with 3 strangers in a single outing. No words needed.",
  },
  {
    id: "acknowledge",
    name: "Acknowledge",
    rank: "D",
    target: 7,
    description:
      "Greet 3 strangers out loud — 'hi', 'morning', 'hey'. Voice breaks the silence.",
  },
  {
    id: "request",
    name: "Request",
    rank: "C",
    target: 10,
    description:
      "Ask a stranger a small, low-stakes question — the time, directions, a recommendation.",
  },
  {
    id: "small-talk",
    name: "Small Talk",
    rank: "B",
    target: 10,
    description:
      "Trade a brief comment with a cashier, barista, or seatmate. An observation, a compliment, a remark about the moment.",
  },
  {
    id: "engage",
    name: "Engage",
    rank: "A",
    target: 12,
    description:
      "Hold a 1–2 minute conversation with a stranger. Ask a follow-up. Find the thread.",
  },
  {
    id: "expose",
    name: "Expose",
    rank: "S",
    target: 15,
    description:
      "Share an opinion, story, or joke in a group setting — meeting, class, party. Be seen and heard.",
  },
];

export const GYM_LIFE_WORKOUTS: WorkoutType[] = [
  { id: "pushups", name: "Chest & Shoulders" },
  { id: "pullups", name: "Back & Arms" },
  { id: "legs", name: "Legs & Glutes" },
  { id: "abs", name: "Core" },
  { id: "fullbody", name: "Full Body" },
];

export const NOFAP_TIERS: DungeonTier[] = [
  { rank: "E", days: 7 },
  { rank: "D", days: 14 },
  { rank: "C", days: 30 },
  { rank: "B", days: 60 },
  { rank: "A", days: 90 },
  { rank: "S", days: 180 },
];

// Cumulative cleared-day thresholds shared by every training program —
// keeps the cadence of "rank up" predictable across exercises so a
// player tracking pushups + pullups feels them advance in sync. The
// per-tier rep target is what varies.
const TRAINING_DAY_THRESHOLDS = [7, 21, 51, 111, 201, 381];

const PUSHUP_TIERS: TrainingProgramTier[] = [
  { rank: "E", reps: 5, days: TRAINING_DAY_THRESHOLDS[0] },
  { rank: "D", reps: 10, days: TRAINING_DAY_THRESHOLDS[1] },
  { rank: "C", reps: 20, days: TRAINING_DAY_THRESHOLDS[2] },
  { rank: "B", reps: 40, days: TRAINING_DAY_THRESHOLDS[3] },
  { rank: "A", reps: 70, days: TRAINING_DAY_THRESHOLDS[4] },
  { rank: "S", reps: 100, days: TRAINING_DAY_THRESHOLDS[5] },
];

const PULLUP_TIERS: TrainingProgramTier[] = [
  { rank: "E", reps: 2, days: TRAINING_DAY_THRESHOLDS[0] },
  { rank: "D", reps: 4, days: TRAINING_DAY_THRESHOLDS[1] },
  { rank: "C", reps: 8, days: TRAINING_DAY_THRESHOLDS[2] },
  { rank: "B", reps: 15, days: TRAINING_DAY_THRESHOLDS[3] },
  { rank: "A", reps: 25, days: TRAINING_DAY_THRESHOLDS[4] },
  { rank: "S", reps: 40, days: TRAINING_DAY_THRESHOLDS[5] },
];

const SQUAT_TIERS: TrainingProgramTier[] = [
  { rank: "E", reps: 10, days: TRAINING_DAY_THRESHOLDS[0] },
  { rank: "D", reps: 20, days: TRAINING_DAY_THRESHOLDS[1] },
  { rank: "C", reps: 40, days: TRAINING_DAY_THRESHOLDS[2] },
  { rank: "B", reps: 70, days: TRAINING_DAY_THRESHOLDS[3] },
  { rank: "A", reps: 100, days: TRAINING_DAY_THRESHOLDS[4] },
  { rank: "S", reps: 150, days: TRAINING_DAY_THRESHOLDS[5] },
];

/**
 * Resolves the player's current rep target for a training program based
 * on how many days they've cleared so far. Convention matches the
 * existing tier ladders: `tier.days` is the cumulative-cleared threshold
 * to *earn* that rank. Until a player crosses that threshold, the daily
 * target is the reps of that next tier they're working toward.
 *
 * Once the final tier (S) is earned, the target stays at S — players who
 * want to keep going just maintain the S-rank reps daily.
 */
export function trainingProgramTarget(
  tiers: TrainingProgramTier[],
  clearedDays: number
): { earnedTierIdx: number; nextTier: TrainingProgramTier; target: number } {
  const earnedTierIdx = tiers.filter((t) => clearedDays >= t.days).length - 1;
  const nextTier = tiers[earnedTierIdx + 1] ?? tiers[tiers.length - 1];
  return { earnedTierIdx, nextTier, target: nextTier.reps };
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: "caffeine",
    name: "Caffeine Reboot",
    rank: "E",
    ruleType: "continuous_streak",
    tiers: NOFAP_TIERS,
    description:
      "Reset the nervous system. Up to 2 coffees per month is fine — the 3rd ends the run.",
    rules: [
      "Up to 2 coffees per month is fine. The 3rd is a relapse.",
      "Confirm each day on the calendar — Cleared if you held the line, Relapsed if you broke it.",
      "Cleared days bank XP + dimension points permanently. Relapses are calendar markers — Exit Dungeon is the only way to end the run early.",
    ],
    dimensions: { energy: 3 },
  },
  {
    id: "sensible-diet",
    name: "Diet Challenge",
    rank: "E",
    ruleType: "continuous_streak",
    tiers: NOFAP_TIERS,
    description:
      "Eat with awareness. 2–3 meals a day, no snacking between. Plant-first, animal-source second, seafood after that, meat only if nothing else. Up to 4 unnatural sweets per month — beyond that is a relapse.",
    rules: [
      "2–3 meals per day. No snacks between meals — let the gut rest.",
      "Eat plants first; then animal-source (eggs, dairy, nuts); then seafood; then meat only if no alternative.",
      "Up to 4 unnatural sweets per month is fine. The 5th is a relapse.",
      "Confirm each day on the calendar — Cleared if you held the line, Relapsed if you broke it.",
    ],
    dimensions: { body: 2 },
  },
  {
    id: "gym-life",
    name: "Training Regimen",
    rank: "E",
    ruleType: "cadence",
    tiers: NOFAP_TIERS,
    cadence: {
      weeklyTarget: 5,
      window: "week",
      workouts: GYM_LIFE_WORKOUTS,
    },
    description:
      "Forge the body. 5 workouts per week — one per muscle group: Chest & Shoulders, Back & Arms, Legs & Glutes, Core, and Full Body. Discipline is cadence, not intensity.",
    rules: [
      "Complete 5 workouts per week — one of each: Chest & Shoulders, Back & Arms, Legs & Glutes, Core, Full Body.",
      "Pick any exercises that hit the target muscle group. Log when the session is done.",
      "Week runs Monday–Sunday (UTC). Manual relapse if you fall off the cadence.",
    ],
    dimensions: { body: 2, energy: 1 },
  },
  {
    id: "attention-reclaim",
    name: "No Doomscroll",
    rank: "E",
    ruleType: "timed",
    tiers: NOFAP_TIERS,
    timed: { targetDays: 30 },
    description:
      "30 days without doom scrolling. Messaging, posting, and intentional single-video views are fine — only passive infinite feeds count as a slip.",
    dimensions: { mind: 2, spirit: 1 },
  },
  {
    id: "music-sensitization",
    name: "Sound Sensitization",
    rank: "E",
    ruleType: "timed",
    tiers: NOFAP_TIERS,
    timed: { targetDays: 30 },
    description:
      "30 days without music. A sensory reset — let the ears grow quiet so wind, rain, birdsong, and real voices start to feel alive again.",
    rules: [
      "Relapse = intentionally listening to songs (playlists, albums, concerts, background music you chose).",
      "Allowed: podcasts, audiobooks, film scores, nature sounds, and involuntary ambient music (stores, cafes, other people's speakers).",
      "Confirm each day on the calendar. Hit 30 cleared days to unlock Claim Victory.",
    ],
    dimensions: { spirit: 2, mind: 1 },
  },
  {
    id: "social-reclaim",
    name: "Exposure Therapy",
    rank: "E",
    ruleType: "progressive",
    progressive: { rungs: SOCIAL_RECLAIM_RUNGS },
    description:
      "Climb the social ladder. Six rungs from silent presence to speaking up in groups — desensitize through graded exposure, one rung at a time.",
    rules: [
      "Each rung has a target — log an exposure every time you do the action in real life.",
      "Clear the current rung to unlock the next. No skipping.",
      "Rungs progress ranks E → S. Dungeon cleared when the final rung is complete.",
    ],
    dimensions: { emotion: 2, mind: 1 },
  },
  {
    id: "nofap",
    name: "NoFap",
    rank: "E",
    ruleType: "continuous_streak",
    tiers: NOFAP_TIERS,
    description:
      "Reclaim your vital energy. Strict: no porn, masturbation, edging, or gooning. Sex and orgasm with a partner are fine — the rule targets compulsive solo use, not intimacy.",
    rules: [
      "Relapse = porn, masturbation, edging, or gooning (thirst traps, bot accounts, sensualized social feeds).",
      "Allowed: sex and orgasm with a partner — this dungeon is about compulsion, not abstinence.",
      "Check in each day on the calendar — Cleared or Relapsed. Cleared days bank XP + dimensions permanently. Relapses are markers, not resets.",
    ],
    dimensions: { emotion: 2, spirit: 1 },
  },
  {
    id: "training-pushups",
    name: "Pushup Ladder",
    rank: "E",
    ruleType: "training_program",
    hunterType: "body",
    description:
      "Daily pushup target rises with every tier you clear. E starts at 5/day; S asks for 100. Each cleared day banks the rep count and the discipline.",
    trainingProgram: {
      unit: "pushup",
      unitPlural: "pushups",
      actionVerb: "Log Pushups",
      tiers: PUSHUP_TIERS,
    },
    dimensions: { body: 3 },
  },
  {
    id: "training-pullups",
    name: "Pullup Ladder",
    rank: "E",
    ruleType: "training_program",
    hunterType: "body",
    description:
      "The hardest body-weight ladder. E asks for 2/day; S asks for 40. Pace yourself — pullups punish the impatient.",
    trainingProgram: {
      unit: "pullup",
      unitPlural: "pullups",
      actionVerb: "Log Pullups",
      tiers: PULLUP_TIERS,
    },
    dimensions: { body: 3 },
  },
  {
    id: "training-squats",
    name: "Squat Ladder",
    rank: "E",
    ruleType: "training_program",
    hunterType: "body",
    description:
      "Legs forge the foundation. E starts at 10/day; S asks for 150. Bodyweight squats — go deep, breathe, stack the days.",
    trainingProgram: {
      unit: "squat",
      unitPlural: "squats",
      actionVerb: "Log Squats",
      tiers: SQUAT_TIERS,
    },
    dimensions: { body: 2, energy: 1 },
  },
];

export function getDungeon(id: string): DungeonDef | undefined {
  return DUNGEONS.find((d) => d.id === id);
}

export function getDungeonRules(d: DungeonDef): string[] {
  if (d.rules && d.rules.length > 0) return d.rules;
  switch (d.ruleType) {
    case "continuous_streak":
      return [
        "Confirm each day on the calendar as Cleared or Relapsed.",
        "Cleared days bank XP + dimension points permanently. Relapses are calendar markers — they don't reset your progress.",
        "Clear ranks E → S by accumulating cleared days. Run only ends when you tap Exit Dungeon.",
      ];
    case "timed": {
      const t = d.timed;
      if (!t) return [];
      return [
        `Confirm each day on the calendar — Cleared or Relapsed.`,
        `Reach ${t.targetDays} cleared days to unlock Claim Victory.`,
        "Cleared days bank XP + dimensions permanently. Relapses are calendar markers — Exit Dungeon is the only way to end the run early.",
      ];
    }
    case "cadence": {
      const c = d.cadence;
      if (!c) return [];
      return [
        `Complete ${c.weeklyTarget} workouts per ${c.window}.`,
        "Check off each type as you do it. Uncheck to remove a log.",
        "Week resets Monday–Sunday. Manual relapse if you fall off.",
      ];
    }
    case "progressive": {
      const p = d.progressive;
      if (!p) return [];
      return [
        `Climb a ${p.rungs.length}-rung ladder of escalating exposures.`,
        "Log an exposure each time you complete the current rung's action in real life.",
        "Clear the rung's target to unlock the next. Dungeon cleared when the final rung is complete.",
      ];
    }
    case "training_program": {
      const tp = d.trainingProgram;
      if (!tp) return [];
      const first = tp.tiers[0];
      const last = tp.tiers[tp.tiers.length - 1];
      return [
        `Daily ${tp.unit} target rises with every tier cleared. E starts at ${first.reps} ${tp.unitPlural}; S asks for ${last.reps}.`,
        `Hit today's target to clear the day. Miss it — no shame, just try again tomorrow.`,
        "Cleared days bank XP and advance you toward the next tier. Reaching S puts you in maintenance — keep the daily rep count alive.",
      ];
    }
    default:
      return [];
  }
}

