/**
 * Hunter Types, chosen identity tracks tied 1:1 to the five-dimension
 * framework. Picking a type unlocks type-specific Training Programs
 * (the daily-rep-target ladder) on top of the universal quests +
 * dungeons. Optional, players can stay Unaffiliated indefinitely.
 *
 * Names use the dimension as the noun ("Body Hunter") to lean on the
 * existing 5-dim mental model rather than borrowing Solo Leveling's
 * MMO class names.
 */
export const HUNTER_TYPES = [
  "body",
  "mind",
  "emotion",
  "energy",
  "spirit",
] as const;

export type HunterType = (typeof HUNTER_TYPES)[number];

export interface HunterTypeDef {
  id: HunterType;
  /** Display name on the hunter card, picker, etc. */
  label: string;
  /** The renamed elemental noun used in v2.1.0+ ("Earth", "Water",
   *  etc). Lets the "X-Dominant" badge and similar surfaces show the
   *  elemental theme without hardcoding the internal dimension key. */
  elementName: string;
  /** Short evocative line, appears under the label in the picker. */
  tagline: string;
  /** A sentence or two for the picker card body. */
  description: string;
  /** Tailwind classes for the badge color (text + border + bg). */
  badgeStyle: string;
  /** Tailwind shadow for glow effects on selected state. */
  glow: string;
}

export const HUNTER_TYPE_DEFS: Record<HunterType, HunterTypeDef> = {
  body: {
    id: "body",
    label: "Body Hunter",
    elementName: "Earth",
    tagline: "Forge the vessel.",
    description:
      "Train physical capacity. Pushups, pullups, squats, incremental ladders that climb to S rank. The path of iron and breath.",
    badgeStyle: "text-emerald-300 border-emerald-400/50 bg-emerald-500/10",
    glow: "shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  },
  mind: {
    id: "mind",
    label: "Mind Hunter",
    elementName: "Air",
    tagline: "Sharpen the blade.",
    description:
      "Train intellect. Reading, study, memorization, ladders of focus that compound across years. The path of clarity.",
    badgeStyle: "text-cyan-300 border-cyan-400/50 bg-cyan-500/10",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.4)]",
  },
  emotion: {
    id: "emotion",
    label: "Emotion Hunter",
    elementName: "Water",
    tagline: "Tend the current.",
    description:
      "Train relational depth. Vulnerability, empathy, expression, daily reps of being seen. The path of the moving heart.",
    badgeStyle: "text-blue-300 border-blue-400/50 bg-blue-500/10",
    glow: "shadow-[0_0_12px_rgba(96,165,250,0.4)]",
  },
  energy: {
    id: "energy",
    label: "Energy Hunter",
    elementName: "Fire",
    tagline: "Master the spark.",
    description:
      "Train vitality. Cold exposure, fasting, cardio, ladders that wake the body up. The path of the awakened nervous system.",
    badgeStyle: "text-amber-300 border-amber-400/50 bg-amber-500/10",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  },
  spirit: {
    id: "spirit",
    label: "Spirit Hunter",
    elementName: "Ether",
    tagline: "Touch the silent.",
    description:
      "Train transcendence. Meditation, silence, contemplation, ladders that deepen the inside. The path beyond the self.",
    badgeStyle: "text-violet-300 border-violet-400/50 bg-violet-500/10",
    glow: "shadow-[0_0_12px_rgba(167,139,250,0.4)]",
  },
};

export const HUNTER_TYPE_LIST: HunterTypeDef[] = HUNTER_TYPES.map(
  (id) => HUNTER_TYPE_DEFS[id]
);

export function isHunterType(value: string): value is HunterType {
  return (HUNTER_TYPES as readonly string[]).includes(value);
}
