"use client";
import { useSyncExternalStore } from "react";

export interface GainEntry {
  ts: number;
  source: string;
  xp?: number;
  body?: number;
  mind?: number;
  emotion?: number;
  energy?: number;
  spirit?: number;
}

const KEY = "system:gains-log";
const EVENT = "system:gains-log-changed";
const MAX_ENTRIES = 10;

function read(): GainEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: GainEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
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
  return useSyncExternalStore(subscribe, read, () => []);
}
