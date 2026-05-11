import type { HunterType } from "@/lib/hunterType";

export interface DungeonTier {
  rank: string;
  days: number;
}

export type DungeonRuleType =
  | "continuous_streak"
  | "cadence"
  | "timed"
  | "progressive";

export interface TimedConfig {
  targetDays: number;
}

export interface WorkoutType {
  id: string;
  /**
   * Default display name. Used as-is for qualitative tasks (e.g.
   * "Hold eye contact"). For ramping rep tasks, the card overrides
   * this with `${reps} ${unitPlural}` resolved from `repsByTier`.
   */
  name: string;
  /**
   * Optional per-tier rep target. Indices align with the dungeon's
   * `tiers` array (E=0, D=1, ..., S=last). The card reads the *next*
   * tier the player is working toward, pre-E uses index 0, post-S
   * stays on the last entry (maintenance). Omit for non-ramping
   * tasks.
   */
  repsByTier?: number[];
  /** Singular noun. Required when repsByTier is set. */
  unit?: string;
  /** Plural noun. Required when repsByTier is set. */
  unitPlural?: string;
}

export interface CadenceConfig {
  /** How many of the listed tasks to clear per window. */
  target: number;
  /** "day", resets at UTC midnight. "week", Monday-Sunday UTC. */
  window: "day" | "week";
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

/** Visual accent palette per dungeon, so two NoFap-style streak cards
 *  (e.g. NoFap and Sound Sensitization) don't look identical at a
 *  glance. Each key resolves to a class-set in {@link DUNGEON_ACCENT}. */
export type DungeonAccent =
  | "amber"
  | "emerald"
  | "red"
  | "violet"
  | "sky"
  | "rose"
  | "indigo"
  | "orange"
  | "teal"
  | "pink"
  | "yellow"
  | "fuchsia";

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
  /** Hunter Type gate, only players matching this type can enter. */
  hunterType?: HunterType;
  rules?: string[];
  dimensions?: DungeonDimensions;
  /** Single emoji shown next to the dungeon name. Pure cosmetic. */
  icon?: string;
  /** Visual accent, drives card border + glow color. */
  accent?: DungeonAccent;
}

/** Class-set per accent, kept here as full literals (not built via
 *  template) so Tailwind's purge keeps every variant. */
export const DUNGEON_ACCENT: Record<
  DungeonAccent,
  { border: string; glow: string; iconText: string; nameText: string }
> = {
  amber: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_14px_rgba(251,191,36,0.18)]",
    iconText: "text-amber-300",
    nameText: "text-amber-200/90",
  },
  emerald: {
    border: "border-emerald-500/40",
    glow: "shadow-[0_0_14px_rgba(52,211,153,0.18)]",
    iconText: "text-emerald-300",
    nameText: "text-emerald-200/90",
  },
  red: {
    border: "border-red-500/40",
    glow: "shadow-[0_0_14px_rgba(248,113,113,0.18)]",
    iconText: "text-red-300",
    nameText: "text-red-200/90",
  },
  violet: {
    border: "border-violet-500/40",
    glow: "shadow-[0_0_14px_rgba(167,139,250,0.18)]",
    iconText: "text-violet-300",
    nameText: "text-violet-200/90",
  },
  sky: {
    border: "border-sky-500/40",
    glow: "shadow-[0_0_14px_rgba(56,189,248,0.18)]",
    iconText: "text-sky-300",
    nameText: "text-sky-200/90",
  },
  rose: {
    border: "border-rose-500/40",
    glow: "shadow-[0_0_14px_rgba(251,113,133,0.18)]",
    iconText: "text-rose-300",
    nameText: "text-rose-200/90",
  },
  indigo: {
    border: "border-indigo-500/40",
    glow: "shadow-[0_0_14px_rgba(129,140,248,0.18)]",
    iconText: "text-indigo-300",
    nameText: "text-indigo-200/90",
  },
  orange: {
    border: "border-orange-500/40",
    glow: "shadow-[0_0_14px_rgba(251,146,60,0.18)]",
    iconText: "text-orange-300",
    nameText: "text-orange-200/90",
  },
  teal: {
    border: "border-teal-500/40",
    glow: "shadow-[0_0_14px_rgba(45,212,191,0.18)]",
    iconText: "text-teal-300",
    nameText: "text-teal-200/90",
  },
  pink: {
    border: "border-pink-500/40",
    glow: "shadow-[0_0_14px_rgba(244,114,182,0.18)]",
    iconText: "text-pink-300",
    nameText: "text-pink-200/90",
  },
  yellow: {
    border: "border-yellow-500/40",
    glow: "shadow-[0_0_14px_rgba(250,204,21,0.18)]",
    iconText: "text-yellow-300",
    nameText: "text-yellow-200/90",
  },
  fuchsia: {
    border: "border-fuchsia-500/40",
    glow: "shadow-[0_0_14px_rgba(232,121,249,0.18)]",
    iconText: "text-fuchsia-300",
    nameText: "text-fuchsia-200/90",
  },
};

/** Cyan fallback for any dungeon without an explicit accent. */
export const DEFAULT_DUNGEON_ACCENT = {
  border: "border-cyan-500/20",
  glow: "shadow-[0_0_10px_rgba(34,211,238,0.1)]",
  iconText: "text-cyan-300",
  nameText: "text-cyan-100",
} as const;

export function getDungeonAccent(id: string) {
  const accent = getDungeon(id)?.accent;
  return accent ? DUNGEON_ACCENT[accent] : DEFAULT_DUNGEON_ACCENT;
}

// Multipliers for rank-cleared dimension rewards (E, D, C, B, A, S).
// Each rank cleared adds base × multiplier to the mapped dimensions.
export const DIMENSION_RANK_MULTIPLIERS = [1, 2, 4, 8, 16, 32];

// One-time XP bonus credited the moment a player crosses a dungeon tier
// (E → D → ... → S). Cumulative across tiers, reaching S earns the full
// 100 + 200 + 400 + 800 + 1600 + 3200 = 6300 XP from that dungeon's
// tier ladder alone.
export const TIER_BONUS_XP = [100, 200, 400, 800, 1600, 3200];

// Per-action scaling bonus added on top of the base XP rate, indexed by
// the highest tier the player has cleared in that dungeon. Caps at +30
// at S rank, this is the system's hard ceiling on per-action XP.
export const TIER_PER_ACTION_BONUS = [5, 10, 15, 20, 25, 30];

/** Bonus XP awarded when a cadence dungeon's window is fully cleared
 *  (every workout in the list, not just enough to hit the cadence
 *  target). Fires once per (dungeonId, windowStart). For Training
 *  Regimen this rewards the 5/5 week. For starter dungeons (target=1,
 *  3 tasks) it rewards the rare day where all three get done. */
export const CADENCE_FULL_CLEAR_BONUS_XP = 20;

export const DIM_ORDER = ["body", "mind", "emotion", "energy", "spirit"] as const;
export type DimKey = (typeof DIM_ORDER)[number];

// Per-element palette. Mapped to canonical Pancha Mahabhuta colors:
//   Earth   -> emerald  (grass / ground)
//   Air     -> slate    (clear / silver-white; distinct from Water)
//   Water   -> blue     (the obvious one)
//   Fire    -> amber    (flame)
//   Ether   -> violet   (void / transcendence)
// Air was cyan, but cyan reads as "shade of blue" next to Water's
// blue and the two elements blurred together. Pure-white-ish slate
// keeps Air visually distinct and matches the classical-element
// convention of Air = clear/silver.
// Used everywhere a dungeon's element tag is shown so the same color
// reads consistently across portals, the guide, briefing modal, and
// the radar chart.
export const DIM_STYLE: Record<DimKey, string> = {
  body: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  mind: "text-slate-200 border-slate-300/40 bg-slate-400/10",
  emotion: "text-blue-300 border-blue-400/40 bg-blue-500/10",
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
      "Greet 3 strangers out loud, 'hi', 'morning', 'hey'. Voice breaks the silence.",
  },
  {
    id: "request",
    name: "Request",
    rank: "C",
    target: 10,
    description:
      "Ask a stranger a small, low-stakes question, the time, directions, a recommendation.",
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
      "Share an opinion, story, or joke in a group setting, meeting, class, party. Be seen and heard.",
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

export const DUNGEONS: DungeonDef[] = [
  {
    id: "caffeine",
    name: "Caffeine Reboot",
    rank: "E",
    ruleType: "continuous_streak",
    tiers: NOFAP_TIERS,
    icon: "☕",
    accent: "amber",
    description:
      "Reset the nervous system. Up to 2 coffees per month is fine, the 3rd ends the run.",
    rules: [
      "Up to 2 coffees per month is fine. The 3rd is a relapse.",
      "Confirm each day on the calendar, Cleared if you held the line, Relapsed if you broke it.",
      "Cleared days bank XP + dimension points permanently. Relapses are calendar markers, Exit Dungeon is the only way to end the run early.",
    ],
    dimensions: { energy: 3 },
  },
  {
    id: "sensible-diet",
    name: "Diet Challenge",
    rank: "E",
    ruleType: "continuous_streak",
    tiers: NOFAP_TIERS,
    icon: "🌿",
    accent: "emerald",
    description:
      "Eat with awareness. 2–3 meals a day, no snacking between. Plant-first, animal-source second, seafood after that, meat only if nothing else. Up to 4 unnatural sweets per month, beyond that is a relapse.",
    rules: [
      "2–3 meals per day. No snacks between meals, let the gut rest.",
      "Eat plants first; then animal-source (eggs, dairy, nuts); then seafood; then meat only if no alternative.",
      "Up to 4 unnatural sweets per month is fine. The 5th is a relapse.",
      "Confirm each day on the calendar, Cleared if you held the line, Relapsed if you broke it.",
    ],
    dimensions: { body: 2 },
  },
  {
    id: "gym-life",
    name: "Training Regimen",
    rank: "E",
    ruleType: "cadence",
    tiers: NOFAP_TIERS,
    icon: "💪",
    accent: "red",
    cadence: {
      target: 5,
      window: "week",
      workouts: GYM_LIFE_WORKOUTS,
    },
    description:
      "Forge the body. 5 workouts per week, one per muscle group: Chest & Shoulders, Back & Arms, Legs & Glutes, Core, and Full Body. Discipline is cadence, not intensity.",
    rules: [
      "Complete 5 workouts per week, one of each: Chest & Shoulders, Back & Arms, Legs & Glutes, Core, Full Body.",
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
    icon: "🧠",
    accent: "violet",
    timed: { targetDays: 30 },
    description:
      "30 days without doom scrolling. Messaging, posting, and intentional single-video views are fine, only passive infinite feeds count as a slip.",
    dimensions: { mind: 2, spirit: 1 },
  },
  {
    id: "music-sensitization",
    name: "Sound Sensitization",
    rank: "E",
    ruleType: "timed",
    tiers: NOFAP_TIERS,
    icon: "🔇",
    accent: "sky",
    timed: { targetDays: 30 },
    description:
      "30 days without music. A sensory reset, let the ears grow quiet so wind, rain, birdsong, and real voices start to feel alive again.",
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
    icon: "👁",
    accent: "rose",
    progressive: { rungs: SOCIAL_RECLAIM_RUNGS },
    description:
      "Climb the social ladder. Six rungs from silent presence to speaking up in groups, desensitize through graded exposure, one rung at a time.",
    rules: [
      "Each rung has a target, log an exposure every time you do the action in real life.",
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
    icon: "🛡",
    accent: "indigo",
    description:
      "Reclaim your vital energy. Strict: no porn, masturbation, edging, or gooning. Sex and orgasm with a partner are fine, the rule targets compulsive solo use, not intimacy.",
    rules: [
      "Relapse = porn, masturbation, edging, or gooning (thirst traps, bot accounts, sensualized social feeds).",
      "Allowed: sex and orgasm with a partner, this dungeon is about compulsion, not abstinence.",
      "Check in each day on the calendar, Cleared or Relapsed. Cleared days bank XP + dimensions permanently. Relapses are markers, not resets.",
    ],
    // Reframed 2026-05-10 from {emotion: 2, spirit: 1} to
    // {energy: 2, emotion: 1}: NoFap's core claim is reclaiming
    // vital energy (the description literally says so), not spiritual
    // attainment. Emotion stays at +1 because the practice does
    // affect mood / impulse-regulation. Spirit was the wrong tag.
    dimensions: { energy: 2, emotion: 1 },
  },
  // Starter routines, one per Hunter Type. Tiny daily floors, three
  // boxes each, gated by Path. Designed to be doable on the worst day:
  // the goal is the streak, not the volume.
  {
    id: "starter-body",
    name: "Daily Forge",
    rank: "E",
    ruleType: "cadence",
    hunterType: "body",
    tiers: NOFAP_TIERS,
    icon: "🔥",
    accent: "orange",
    cadence: {
      target: 1,
      window: "day",
      workouts: [
        {
          id: "starter-pushups",
          name: "Pushups",
          unit: "pushup",
          unitPlural: "pushups",
          // Indices match NOFAP_TIERS: [E, D, C, B, A, S].
          // Pre-E uses index 0; post-S stays on the last entry. The
          // card displays the next tier the player is working toward.
          repsByTier: [5, 10, 20, 40, 70, 100],
        },
        {
          id: "starter-pullups",
          name: "Pullups",
          unit: "pullup",
          unitPlural: "pullups",
          repsByTier: [1, 2, 5, 10, 20, 40],
        },
        {
          id: "starter-squats",
          name: "Squats",
          unit: "squat",
          unitPlural: "squats",
          repsByTier: [10, 20, 40, 70, 110, 150],
        },
      ],
    },
    description:
      "The Body Hunter's daily floor. Three reps that ramp with your rank, clear any one to bank the day. Pushups, pullups, squats grow as your streak climbs E → S.",
    dimensions: { body: 1 },
  },
  {
    id: "starter-mind",
    name: "Daily Sharpening",
    rank: "E",
    ruleType: "cadence",
    hunterType: "mind",
    tiers: NOFAP_TIERS,
    icon: "📖",
    accent: "teal",
    cadence: {
      target: 1,
      window: "day",
      workouts: [
        { id: "starter-read", name: "Read 5 pages" },
        { id: "starter-learn", name: "Learn 1 new word or concept" },
        { id: "starter-reflect", name: "Write 1 line of reflection" },
      ],
    },
    description:
      "The Mind Hunter's daily floor. A few pages, a new idea, a single honest sentence. Clear any one to bank the day.",
    dimensions: { mind: 1 },
  },
  {
    id: "starter-emotion",
    name: "Daily Bonds",
    rank: "E",
    ruleType: "cadence",
    hunterType: "emotion",
    tiers: NOFAP_TIERS,
    icon: "💝",
    accent: "pink",
    cadence: {
      target: 1,
      window: "day",
      workouts: [
        { id: "starter-reach", name: "Reach out to 1 person" },
        { id: "starter-express", name: "Express 1 feeling honestly" },
        { id: "starter-eyes", name: "Hold eye contact with someone" },
      ],
    },
    description:
      "The Emotion Hunter's daily floor. Small reps of being seen, heard, present. Clear any one to bank the day.",
    dimensions: { emotion: 1 },
  },
  {
    id: "starter-energy",
    name: "Daily Spark",
    rank: "E",
    ruleType: "cadence",
    hunterType: "energy",
    tiers: NOFAP_TIERS,
    icon: "⚡",
    accent: "yellow",
    cadence: {
      target: 1,
      window: "day",
      workouts: [
        { id: "starter-cold", name: "30s cold water on face or body" },
        { id: "starter-walk", name: "5-min walk outdoors" },
        { id: "starter-breath", name: "1-min deep breathing" },
      ],
    },
    description:
      "The Energy Hunter's daily floor. Cold, motion, breath, three small jolts to wake the nervous system. Clear any one to bank the day.",
    dimensions: { energy: 1 },
  },
  {
    id: "starter-spirit",
    name: "Daily Stillness",
    rank: "E",
    ruleType: "cadence",
    hunterType: "spirit",
    tiers: NOFAP_TIERS,
    icon: "🕉",
    accent: "fuchsia",
    cadence: {
      target: 1,
      window: "day",
      workouts: [
        { id: "starter-silence", name: "1-min silence" },
        { id: "starter-gratitude", name: "Write 1 line of gratitude" },
        { id: "starter-skip", name: "Skip one craving" },
      ],
    },
    description:
      "The Spirit Hunter's daily floor. A breath of silence, a sentence of thanks, one craving denied. Clear any one to bank the day.",
    dimensions: { spirit: 1 },
  },
];

export function getDungeon(id: string): DungeonDef | undefined {
  return DUNGEONS.find((d) => d.id === id);
}

