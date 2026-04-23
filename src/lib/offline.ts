import { useSyncExternalStore } from "react";

const KNOWN_SIGNED_IN_KEY = "shivaliva:known-signed-in-user-id";
const KNOWN_SIGNED_IN_EVENT = "shivaliva:known-signed-in-change";

export function markKnownSignedIn(userId: string): void {
  try {
    if (localStorage.getItem(KNOWN_SIGNED_IN_KEY) === userId) return;
    localStorage.setItem(KNOWN_SIGNED_IN_KEY, userId);
    window.dispatchEvent(new Event(KNOWN_SIGNED_IN_EVENT));
  } catch {}
}

export function clearKnownSignedIn(): void {
  try {
    if (localStorage.getItem(KNOWN_SIGNED_IN_KEY) === null) return;
    localStorage.removeItem(KNOWN_SIGNED_IN_KEY);
    window.dispatchEvent(new Event(KNOWN_SIGNED_IN_EVENT));
  } catch {}
}

export function getKnownSignedInUserId(): string | null {
  try {
    return localStorage.getItem(KNOWN_SIGNED_IN_KEY);
  } catch {
    return null;
  }
}

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

function getOnlineServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );
}

function subscribeKnownSignedIn(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(KNOWN_SIGNED_IN_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KNOWN_SIGNED_IN_EVENT, cb);
  };
}

function getKnownSignedInSnapshot(): string | null {
  return getKnownSignedInUserId();
}

function getKnownSignedInServerSnapshot(): string | null {
  return null;
}

export function useKnownSignedInUserId(): string | null {
  return useSyncExternalStore(
    subscribeKnownSignedIn,
    getKnownSignedInSnapshot,
    getKnownSignedInServerSnapshot
  );
}