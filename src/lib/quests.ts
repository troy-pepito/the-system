export interface Quest {
  id: string;
  name: string;
  xp: number;
  body?: number;
  mind?: number;
  emotion?: number;
  energy?: number;
  spirit?: number;
}

export interface QuestRewards {
  xp: number;
  body: number;
  mind: number;
  emotion: number;
  energy: number;
  spirit: number;
}

export const ZERO_REWARDS: QuestRewards = {
  xp: 0,
  body: 0,
  mind: 0,
  emotion: 0,
  energy: 0,
  spirit: 0,
};

export const QUESTS: Quest[] = [
  { id: "cold-shower", name: "Cold Shower", xp: 10, body: 2, energy: 1 },
  { id: "supplements", name: "Take Supplements", xp: 10, body: 2 },
  { id: "meditation", name: "Meditation / Yoga", xp: 10, spirit: 2, energy: 1 },
  { id: "cardio", name: "Walk or Run (10+ min)", xp: 10, body: 2 },
  { id: "journal", name: "Journal Entry", xp: 10, mind: 1, emotion: 2 },
  { id: "read", name: "Read (10+ pages)", xp: 10, mind: 2 },
  { id: "clean-room", name: "Clean Room", xp: 10, mind: 1 },
];

export function applyQuest(
  current: QuestRewards,
  q: Quest,
  sign: 1 | -1
): QuestRewards {
  return {
    xp: current.xp + sign * q.xp,
    body: current.body + sign * (q.body ?? 0),
    mind: current.mind + sign * (q.mind ?? 0),
    emotion: current.emotion + sign * (q.emotion ?? 0),
    energy: current.energy + sign * (q.energy ?? 0),
    spirit: current.spirit + sign * (q.spirit ?? 0),
  };
}

export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}