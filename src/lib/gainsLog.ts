"use client";
import { useSyncExternalStore } from "react";

export interface GainEntry {
  ts: number;
  /**
   * Translation key path for the source label, e.g.
   * "dailyQuests.quest_cold_shower" or "gainSources.taskCleared".
   * Resolved at render time so the label follows the active locale
   * even when it changes after the gain was written.
   */
  sourceKey?: string;
  /**
   * Placeholder values for `sourceKey`. A `dungeonId` value is special:
   * it gets resolved to the dungeon's translated name at render and
   * exposed as `dungeon` to the template.
   */
  sourceValues?: Record<string, string | number>;
  /**
   * Legacy: pre-i18n entries store the resolved English string here.
   * New writes should set `sourceKey` instead.
   */
  source?: string;
  xp?: number;
  body?: number;
  mind?: number;
  emotion?: number;
  energy?: number;
  spirit?: number;
}

/**
 * Resolve the source label for a gain entry. Falls back to the legacy
 * `source` field for entries written before the i18n refactor.
 */
export function resolveGainSource(
  entry: GainEntry,
  translate: (key: string, values?: Record<string, string | number>) => string,
  resolveDungeonName: (dungeonId: string) => string
): string {
  if (entry.sourceKey) {
    const values: Record<string, string | number> = {
      ...(entry.sourceValues ?? {}),
    };
    if (typeof values.dungeonId === "string") {
      values.dungeon = resolveDungeonName(values.dungeonId);
    }
    try {
      return translate(entry.sourceKey, values);
    } catch {
      return entry.source ?? "";
    }
  }
  return entry.source ?? "";
}

const KEY = "system:gains-log";
const EVENT = "system:gains-log-changed";
const MAX_ENTRIES = 10;

const EMPTY: GainEntry[] = [];

// Cache the latest parsed snapshot so useSyncExternalStore sees a stable
// reference while nothing has changed. Returning a fresh array on every
// call (which JSON.parse would do) makes React infinite-loop.
let cachedRaw: string | null = null;
let cachedSnapshot: GainEntry[] = EMPTY;

function read(): GainEntry[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cachedSnapshot;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = EMPTY;
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedSnapshot = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cachedSnapshot = EMPTY;
  }
  return cachedSnapshot;
}

function write(entries: GainEntry[]): void {
  try {
    const serialized = JSON.stringify(entries);
    localStorage.setItem(KEY, serialized);
    // Pre-warm the cache so the next read() returns this exact array.
    cachedRaw = serialized;
    cachedSnapshot = entries;
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Quota or serialization failure — skip; the toast already fired.
  }
}

export function appendGain(entry: GainEntry): void {
  const next = [entry, ...read()].slice(0, MAX_ENTRIES);
  write(next);
}

export function getGains(): GainEntry[] {
  return read();
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useGains(): GainEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
