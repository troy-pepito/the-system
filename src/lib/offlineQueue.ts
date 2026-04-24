import { useSyncExternalStore } from "react";

export type QuestToggleMutation = {
  id: string;
  type: "quest:toggle";
  questId: string;
  date: string;
  desiredCompleted: boolean;
};

export type Mutation = QuestToggleMutation;

const QUEUE_KEY = "shivaliva:queue";
const QUEUE_EVENT = "shivaliva:queue-change";

export function getQueue(): Mutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Mutation[];
  } catch {
    return [];
  }
}

function writeQueue(q: Mutation[]): void {
  try {
    if (q.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    window.dispatchEvent(new Event(QUEUE_EVENT));
  } catch {}
}

export function enqueueMutation(m: Mutation): void {
  const q = getQueue();
  q.push(m);
  writeQueue(q);
}

export function removeMutations(ids: string[]): void {
  const set = new Set(ids);
  const q = getQueue().filter((m) => !set.has(m.id));
  writeQueue(q);
}

export function newMutationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function subscribeQueue(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(QUEUE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(QUEUE_EVENT, cb);
  };
}

function getQueueCountSnapshot(): number {
  return getQueue().length;
}

function getQueueCountServerSnapshot(): number {
  return 0;
}

export function useQueueCount(): number {
  return useSyncExternalStore(
    subscribeQueue,
    getQueueCountSnapshot,
    getQueueCountServerSnapshot
  );
}