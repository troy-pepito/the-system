import { DUNGEONS } from "@/lib/dungeons";
import { COMBO_MILESTONES } from "@/lib/quests";

export type AchievementRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary";

export interface WindowStats {
  questTotal: number;
  workoutTotal: number;
  exposureTotal: number;
  perfectQuestDays: number;
}

export interface PlayerSnapshot {
  totalXp: number;
  level: number;
  activeRunCount: number;
  runsByDungeon: Record<
    string,
    { active: boolean; activeStreak: number; maxStreak: number; completed: boolean }
  >;
  eventCounts: Record<string, number>;
  workoutTotal: number;
  exposureTotal: number;
  rungCounts: Record<string, number>;
  questTotal: number;
  perfectQuestDays: number;
  completedRunCount: number;
  dimensions: {
    body: number;
    mind: number;
    emotion: number;
    energy: number;
    spirit: number;
  };
  windows: {
    week: WindowStats;
    month: WindowStats;
  };
  comboMilestoneXp: number;
  comboMilestoneIds: string[];
  scattered: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  hidden?: boolean;
  check: (s: PlayerSnapshot) => boolean;
}

const anyDungeonStreakAtLeast = (days: number) => (s: PlayerSnapshot) =>
  Object.values(s.runsByDungeon).some((r) => r.maxStreak >= days);

export const ACHIEVEMENTS: AchievementDef[] = [
  // ——— STARTER (common) ———
  {
    id: "awakened",
    name: "Awakened",
    description: "Accept the call. Enter your first dungeon.",
    icon: "✦",
    rarity: "common",
    check: (s) => Object.keys(s.runsByDungeon).length > 0,
  },
  {
    id: "first-streak",
    name: "First Blood",
    description: "Survive your first day inside a dungeon.",
    icon: "◆",
    rarity: "common",
    check: anyDungeonStreakAtLeast(1),
  },
  {
    id: "first-quest",
    name: "Quest Taken",
    description: "Complete your first daily quest.",
    icon: "✓",
    rarity: "common",
    check: (s) => s.questTotal >= 1,
  },
  {
    id: "first-workout",
    name: "First Rep",
    description: "Log a workout in Gym Life.",
    icon: "⚔",
    rarity: "common",
    check: (s) => s.workoutTotal >= 1,
  },
  {
    id: "first-exposure",
    name: "Silent Presence",
    description: "Log your first exposure in the therapy ladder.",
    icon: "◉",
    rarity: "common",
    check: (s) => s.exposureTotal >= 1,
  },

  // ——— RANK PROGRESSION (rare) ———
  {
    id: "rank-e",
    name: "E-Rank Clear",
    description: "Hold a 7-day streak in any dungeon.",
    icon: "E",
    rarity: "rare",
    check: anyDungeonStreakAtLeast(7),
  },
  {
    id: "rank-d",
    name: "D-Rank Clear",
    description: "Reach 14 days in any dungeon.",
    icon: "D",
    rarity: "rare",
    check: anyDungeonStreakAtLeast(14),
  },
  {
    id: "rank-c",
    name: "C-Rank Clear",
    description: "Reach 30 days in any dungeon.",
    icon: "C",
    rarity: "epic",
    check: anyDungeonStreakAtLeast(30),
  },
  {
    id: "rank-b",
    name: "B-Rank Clear",
    description: "Reach 60 days in any dungeon.",
    icon: "B",
    rarity: "epic",
    check: anyDungeonStreakAtLeast(60),
  },
  {
    id: "rank-a",
    name: "A-Rank Clear",
    description: "Reach 90 days in any dungeon.",
    icon: "A",
    rarity: "legendary",
    check: anyDungeonStreakAtLeast(90),
  },
  {
    id: "rank-s",
    name: "S-Rank Ascendant",
    description: "Reach 180 days in any dungeon.",
    icon: "S",
    rarity: "legendary",
    check: anyDungeonStreakAtLeast(180),
  },

  // ——— CROSS-DUNGEON ———
  {
    id: "multi-classed",
    name: "Multi-Classed",
    description: "Be active in 3 dungeons at once.",
    icon: "✧",
    rarity: "rare",
    check: (s) => s.activeRunCount >= 3,
  },
  {
    id: "polymath",
    name: "Polymath",
    description: "Be active in all 5 dungeons simultaneously.",
    icon: "✺",
    rarity: "epic",
    check: (s) => s.activeRunCount >= 5,
  },

  // ——— QUEST MASTERY ———
  {
    id: "perfect-day",
    name: "Perfect Day",
    description: "Complete every daily quest in a single day.",
    icon: "☀",
    rarity: "rare",
    check: (s) => s.perfectQuestDays >= 1,
  },
  {
    id: "grinder",
    name: "The Grinder",
    description: "50 total quest completions.",
    icon: "⟁",
    rarity: "rare",
    check: (s) => s.questTotal >= 50,
  },
  {
    id: "grind-lord",
    name: "Grind Lord",
    description: "250 total quest completions.",
    icon: "⟁",
    rarity: "legendary",
    check: (s) => s.questTotal >= 250,
  },

  // ——— WORKOUT ———
  {
    id: "iron-will",
    name: "Iron Will",
    description: "Complete 10 workouts.",
    icon: "⚒",
    rarity: "rare",
    check: (s) => s.workoutTotal >= 10,
  },
  {
    id: "forged",
    name: "Forged",
    description: "100 workouts logged.",
    icon: "⚒",
    rarity: "epic",
    check: (s) => s.workoutTotal >= 100,
  },

  // ——— EXPOSURE ———
  {
    id: "ladder-climber",
    name: "Ladder Climber",
    description: "Clear 3 rungs of the exposure ladder.",
    icon: "⇡",
    rarity: "rare",
    check: (s) => {
      const rungs = ["presence", "acknowledge", "request", "small-talk", "engage", "expose"];
      const targets = [5, 7, 10, 10, 12, 15];
      let cleared = 0;
      for (let i = 0; i < rungs.length; i++) {
        if ((s.rungCounts[rungs[i]] ?? 0) >= targets[i]) cleared++;
      }
      return cleared >= 3;
    },
  },
  {
    id: "fearless",
    name: "Fearless",
    description: "Complete the entire exposure ladder.",
    icon: "⚡",
    rarity: "legendary",
    check: (s) => {
      const rungs = ["presence", "acknowledge", "request", "small-talk", "engage", "expose"];
      const targets = [5, 7, 10, 10, 12, 15];
      return rungs.every((r, i) => (s.rungCounts[r] ?? 0) >= targets[i]);
    },
  },

  // ——— COMPLETION ———
  {
    id: "dungeon-master",
    name: "Dungeon Master",
    description: "Successfully clear and retire a dungeon.",
    icon: "★",
    rarity: "epic",
    check: (s) => s.completedRunCount >= 1,
  },
  {
    id: "conqueror",
    name: "Conqueror",
    description: "Clear 3 dungeons to completion.",
    icon: "✦",
    rarity: "legendary",
    check: (s) => s.completedRunCount >= 3,
  },

  // ——— LEVEL MILESTONES ———
  {
    id: "level-5",
    name: "Novice Hunter",
    description: "Reach level 5.",
    icon: "❖",
    rarity: "common",
    check: (s) => s.level >= 5,
  },
  {
    id: "level-10",
    name: "Adept",
    description: "Reach level 10.",
    icon: "❖",
    rarity: "rare",
    check: (s) => s.level >= 10,
  },
  {
    id: "level-25",
    name: "Veteran",
    description: "Reach level 25.",
    icon: "❖",
    rarity: "epic",
    check: (s) => s.level >= 25,
  },
  {
    id: "level-50",
    name: "Shadow Monarch",
    description: "Reach level 50.",
    icon: "♚",
    rarity: "legendary",
    check: (s) => s.level >= 50,
  },
];

function rarityForRank(rank: string): AchievementRarity {
  switch (rank) {
    case "E":
    case "D":
      return "rare";
    case "C":
    case "B":
      return "epic";
    case "A":
    case "S":
      return "legendary";
    default:
      return "common";
  }
}

function perDungeonAchievements(): AchievementDef[] {
  const result: AchievementDef[] = [];
  for (const d of DUNGEONS) {
    if (d.tiers) {
      for (const tier of d.tiers) {
        if (
          d.ruleType === "timed" &&
          d.timed &&
          tier.days > d.timed.targetDays
        ) {
          continue;
        }
        const dungeonId = d.id;
        const days = tier.days;
        const rank = tier.rank;
        result.push({
          id: `${dungeonId}-rank-${rank.toLowerCase()}`,
          name: `${d.name}: Rank ${rank}`,
          description: `Reach ${days} days in ${d.name}.`,
          icon: rank,
          rarity: rarityForRank(rank),
          check: (s) => {
            const r = s.runsByDungeon[dungeonId];
            return !!r && r.maxStreak >= days;
          },
        });
      }
    }
    if (d.progressive) {
      for (const rung of d.progressive.rungs) {
        const dungeonId = d.id;
        const rungId = rung.id;
        const target = rung.target;
        result.push({
          id: `${dungeonId}-rung-${rungId}`,
          name: `${d.name}: ${rung.name}`,
          description: `Clear the ${rung.name} rung in ${d.name} (${target} exposures).`,
          icon: rung.rank,
          rarity: rarityForRank(rung.rank),
          check: (s) => (s.rungCounts[rungId] ?? 0) >= target,
        });
      }
    }
    if (d.ruleType === "timed" && d.timed) {
      const dungeonId = d.id;
      const target = d.timed.targetDays;
      result.push({
        id: `${dungeonId}-cleared`,
        name: `${d.name}: Cleared`,
        description: `Complete the full ${target}-day ${d.name} run.`,
        icon: "★",
        rarity: "legendary",
        check: (s) => {
          const r = s.runsByDungeon[dungeonId];
          return !!r && r.completed;
        },
      });
    }
  }
  return result;
}

ACHIEVEMENTS.push(...perDungeonAchievements());

const COMBO_ID_REGEX = /^combo-(\d{4}-\d{2}-\d{2})-(\d+)$/;

function rarityForComboDays(days: number): AchievementRarity {
  if (days >= 180) return "legendary";
  if (days >= 60) return "epic";
  if (days >= 14) return "rare";
  return "common";
}

export function getAchievement(id: string): AchievementDef | undefined {
  const direct = ACHIEVEMENTS.find((a) => a.id === id);
  if (direct) return direct;
  const match = COMBO_ID_REGEX.exec(id);
  if (match) {
    const days = parseInt(match[2], 10);
    const milestone = COMBO_MILESTONES.find((m) => m.days === days);
    if (!milestone) return undefined;
    return {
      id,
      name: `${days}-Day Combo`,
      description: `Daily quest combo reached ${days} days. +${milestone.xp} XP`,
      icon: "⚡",
      rarity: rarityForComboDays(days),
      check: () => false,
    };
  }
  return undefined;
}

export function isComboAchievementId(id: string): boolean {
  return COMBO_ID_REGEX.test(id);
}

export type AchievementCategory =
  | "foundations"
  | "progression"
  | "training"
  | "dungeon";

const FOUNDATION_IDS = new Set([
  "awakened",
  "first-streak",
  "first-quest",
  "first-workout",
  "first-exposure",
]);

const TRAINING_IDS = new Set([
  "perfect-day",
  "grinder",
  "grind-lord",
  "iron-will",
  "forged",
  "ladder-climber",
  "fearless",
]);

export function achievementCategory(
  id: string
): { category: AchievementCategory; dungeonId?: string } {
  if (FOUNDATION_IDS.has(id)) return { category: "foundations" };
  if (TRAINING_IDS.has(id)) return { category: "training" };
  for (const d of DUNGEONS) {
    if (id.startsWith(`${d.id}-`)) {
      return { category: "dungeon", dungeonId: d.id };
    }
  }
  return { category: "progression" };
}

export function rarityStyle(rarity: AchievementRarity): {
  text: string;
  border: string;
  bg: string;
  glow: string;
  label: string;
} {
  switch (rarity) {
    case "common":
      return {
        text: "text-slate-300",
        border: "border-slate-600",
        bg: "bg-slate-800/40",
        glow: "",
        label: "Common",
      };
    case "rare":
      return {
        text: "text-cyan-300",
        border: "border-cyan-500/40",
        bg: "bg-cyan-500/10",
        glow: "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
        label: "Rare",
      };
    case "epic":
      return {
        text: "text-fuchsia-300",
        border: "border-fuchsia-500/50",
        bg: "bg-fuchsia-500/10",
        glow: "drop-shadow-[0_0_10px_rgba(232,121,249,0.6)]",
        label: "Epic",
      };
    case "legendary":
      return {
        text: "text-amber-300",
        border: "border-amber-400/60",
        bg: "bg-amber-500/15",
        glow: "drop-shadow-[0_0_14px_rgba(251,191,36,0.8)]",
        label: "Legendary",
      };
  }
}