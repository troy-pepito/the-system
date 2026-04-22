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
  { id: "cold-shower", name: "Cold Shower", xp: 10, body: 1, energy: 1, spirit: 1 },
  { id: "supplements", name: "Take Supplements", xp: 10, body: 1, energy: 2 },
  { id: "meditation", name: "Meditation / Yoga", xp: 10, spirit: 1, mind: 1, emotion: 1 },
  { id: "cardio", name: "Walk / Run (10+ min)", xp: 10, body: 2, energy: 1 },
  { id: "journal", name: "Journal Entry", xp: 10, mind: 1, emotion: 2 },
  { id: "read", name: "Study / Read (10+ pages)", xp: 10, mind: 2, spirit: 1 },
  { id: "clean-room", name: "Clean Room", xp: 10, mind: 1, emotion: 1, spirit: 1 },
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

export const COMBO_THRESHOLD = 3;

export const COMBO_MILESTONES: ReadonlyArray<{ days: number; xp: number }> = [
  { days: 7, xp: 50 },
  { days: 14, xp: 100 },
  { days: 30, xp: 200 },
  { days: 60, xp: 400 },
  { days: 90, xp: 600 },
  { days: 180, xp: 1000 },
  { days: 365, xp: 2500 },
];

export interface ComboRun {
  startISO: string;
  endISO: string;
  days: number;
}

export function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function computeComboRuns(qualifyingDatesSortedAsc: string[]): ComboRun[] {
  const runs: ComboRun[] = [];
  if (qualifyingDatesSortedAsc.length === 0) return runs;
  let start = qualifyingDatesSortedAsc[0];
  let prev = qualifyingDatesSortedAsc[0];
  let count = 1;
  for (let i = 1; i < qualifyingDatesSortedAsc.length; i++) {
    const curr = qualifyingDatesSortedAsc[i];
    if (addDaysISO(prev, 1) === curr) {
      count++;
    } else {
      runs.push({ startISO: start, endISO: prev, days: count });
      start = curr;
      count = 1;
    }
    prev = curr;
  }
  runs.push({ startISO: start, endISO: prev, days: count });
  return runs;
}

export function priorComboDays(runs: ComboRun[], todayISO: string): number {
  const last = runs[runs.length - 1];
  if (!last) return 0;
  const yesterdayISO = addDaysISO(todayISO, -1);
  if (last.endISO === yesterdayISO || last.endISO === todayISO) return last.days;
  return 0;
}

export function milestoneXpForRun(days: number): number {
  let sum = 0;
  for (const m of COMBO_MILESTONES) {
    if (days >= m.days) sum += m.xp;
  }
  return sum;
}

export function totalMilestoneXp(runs: ComboRun[]): number {
  return runs.reduce((sum, r) => sum + milestoneXpForRun(r.days), 0);
}

export function milestoneIdsForRuns(runs: ComboRun[]): string[] {
  const ids: string[] = [];
  for (const run of runs) {
    for (const m of COMBO_MILESTONES) {
      if (run.days >= m.days) {
        ids.push(`combo-${run.startISO}-${m.days}`);
      }
    }
  }
  return ids;
}