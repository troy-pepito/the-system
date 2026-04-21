export interface DungeonTier {
  rank: string;
  days: number;
}

export type DungeonRuleType =
  | "continuous_streak"
  | "allowance"
  | "cadence"
  | "timed"
  | "progressive";

export interface AllowanceConfig {
  limit: number;
  window: "month";
  unitLabel: string;
  unitLabelPlural: string;
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
  allowance?: AllowanceConfig;
  description: string;
  timed?: TimedConfig;
  cadence?: CadenceConfig;
  progressive?: ProgressiveConfig;
  rules?: string[];
  dimensions?: DungeonDimensions;
}

// Multipliers for rank-cleared dimension rewards (E, D, C, B, A, S).
// Each rank cleared adds base × multiplier to the mapped dimensions.
export const DIMENSION_RANK_MULTIPLIERS = [1, 2, 4, 8, 16, 32];

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
  { id: "pushups", name: "Pushups" },
  { id: "legs", name: "Legs" },
  { id: "pullups", name: "Pullups" },
  { id: "abs", name: "Abs / Core" },
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
    ruleType: "allowance",
    tiers: NOFAP_TIERS,
    allowance: {
      limit: 2,
      window: "month",
      unitLabel: "coffee",
      unitLabelPlural: "coffees",
    },
    description:
      "Two coffees per month is fine. A third relapses the run.",
    dimensions: { energy: 2 },
  },
  {
    id: "sensible-diet",
    name: "Sensible Diet",
    rank: "E",
    ruleType: "allowance",
    tiers: NOFAP_TIERS,
    allowance: {
      limit: 4,
      window: "month",
      unitLabel: "sweet",
      unitLabelPlural: "sweets",
    },
    description:
      "Eat with awareness. 2–3 meals a day, no snacking between. Plant-first, animal-source second, seafood after that, meat only if nothing else. Up to 4 unnatural sweets per month — a fifth ends the run.",
    rules: [
      "2–3 meals per day. No snacks between meals — let the gut rest.",
      "Eat plants first; then animal-source (eggs, dairy, nuts); then seafood; then meat only if no alternative.",
      "Log a sweet for any candy, soda, donut, pastry, or other processed sugar. 4 per month allowed — the 5th is a relapse.",
    ],
    dimensions: { body: 2, energy: 2 },
  },
  {
    id: "gym-life",
    name: "Gym Life",
    rank: "E",
    ruleType: "cadence",
    tiers: NOFAP_TIERS,
    cadence: {
      weeklyTarget: 5,
      window: "week",
      workouts: GYM_LIFE_WORKOUTS,
    },
    description:
      "Forge the body. 5 workouts per week — one each: Pushups, Legs, Pullups, Abs/Core, Full Body. Discipline is cadence, not intensity.",
    rules: [
      "Complete 5 workouts per week — one of each: Pushups, Legs, Pullups, Abs/Core, Full Body.",
      "Check in on the day the workout is done. Week runs Monday–Sunday (UTC).",
      "Manual relapse if you fall off the cadence. Tiers progress by days since entry.",
    ],
    dimensions: { body: 2 },
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
    dimensions: { mind: 2, spirit: 2 },
  },
  {
    id: "music-sensitization",
    name: "Music Sensitization",
    rank: "E",
    ruleType: "timed",
    tiers: NOFAP_TIERS,
    timed: { targetDays: 30 },
    description:
      "30 days without music. A sensory reset — let the ears grow quiet so wind, rain, birdsong, and real voices start to feel alive again.",
    rules: [
      "Relapse = intentionally listening to songs (playlists, albums, concerts, background music you chose).",
      "Allowed: podcasts, audiobooks, film scores, nature sounds, and involuntary ambient music (stores, cafes, other people's speakers).",
      "Reach day 30 to clear. Claim Victory to retire the run.",
    ],
    dimensions: { spirit: 2, mind: 2 },
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
    dimensions: { emotion: 2 },
  },
  {
    id: "nofap",
    name: "NoFap Dungeon",
    rank: "E",
    ruleType: "continuous_streak",
    tiers: NOFAP_TIERS,
    description:
      "Reclaim your vital energy. Strict: no porn, masturbation, edging, or gooning. Sex and orgasm with a partner are fine — the rule targets compulsive solo use, not intimacy.",
    rules: [
      "Relapse = porn, masturbation, edging, or gooning (thirst traps, bot accounts, sensualized social feeds).",
      "Allowed: sex and orgasm with a partner — this dungeon is about compulsion, not abstinence.",
      "Any relapse resets the streak to 0. Clear ranks E → S by hitting day milestones.",
    ],
    dimensions: { energy: 2, spirit: 2, emotion: 2 },
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
        "Track consecutive days from your entry date.",
        "Any relapse resets the streak to 0.",
        "Clear ranks E → S by hitting each day milestone.",
      ];
    case "allowance": {
      const a = d.allowance;
      if (!a) return [];
      const limitLabel = `${a.limit} ${a.limit === 1 ? a.unitLabel : a.unitLabelPlural}`;
      return [
        `Up to ${limitLabel} per ${a.window} is allowed.`,
        `The ${a.limit + 1}${ordinalSuffix(a.limit + 1)} ${a.unitLabel} logged in a ${a.window} ends the run as a relapse.`,
        "Streak days continue growing as long as you stay under the limit.",
      ];
    }
    case "timed": {
      const t = d.timed;
      if (!t) return [];
      return [
        `Reach day ${t.targetDays} to clear the dungeon.`,
        "Any slip before the target resets the run.",
        "Claim Victory on day " + t.targetDays + " to complete and retire the run.",
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
    default:
      return [];
  }
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

