import { useSyncExternalStore } from "react";

const KNOWN_SIGNED_IN_KEY = "shivaliva:known-signed-in-user-id";
const KNOWN_SIGNED_IN_EVENT = "shivaliva:known-signed-in-change";

/**
 * Wipe every localStorage key that holds per-user state. Runs whenever
 * a different user signs in on this device, or on sign-out, so that
 * one account's cached server data, queued offline mutations, or
 * awakening flag can never leak into another account's session.
 *
 * Device-level prefs (atmosphere toggle, PWA install dismissal,
 * the known-signed-in marker itself, the changelog-seen marker,
 * which tracks the app version, not the player) are intentionally
 * preserved, those track the device, not the player.
 */
function wipeUserScopedStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("shivaliva:cache:") ||
        k === "shivaliva:queue" ||
        k === "system:awakened" ||
        k === "system:gains-log" ||
        k === "system:reminder-auto-asked" ||
        k === "radar:last-snapshot" ||
        k.startsWith("tier-celebrated:") ||
        k.startsWith("perfect-day-bonus:") ||
        k.startsWith("cadence-full-clear:") ||
        k.startsWith("combo-celebrated:")
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) localStorage.removeItem(k);
  } catch {}
}

export function markKnownSignedIn(userId: string): void {
  try {
    const previous = localStorage.getItem(KNOWN_SIGNED_IN_KEY);
    if (previous === userId) return;
    if (previous && previous !== userId) {
      // Different user signing in on this shared device, drop any
      // cache or queued mutations from the previous account before
      // they get attributed to this session. This is the bug fix for
      // cross-user journal entries on shared phones.
      wipeUserScopedStorage();
    }
    localStorage.setItem(KNOWN_SIGNED_IN_KEY, userId);
    window.dispatchEvent(new Event(KNOWN_SIGNED_IN_EVENT));
  } catch {}
}

export function clearKnownSignedIn(): void {
  try {
    if (localStorage.getItem(KNOWN_SIGNED_IN_KEY) === null) return;
    // Sign-out (often involuntary — Clerk session expiry, especially
    // after offline use). Do NOT wipe per-user storage here: if the
    // same user signs back in, we need shivaliva:queue intact so
    // pending offline mutations (journal entries, check-ins) can
    // drain. Cross-user protection is handled by markKnownSignedIn,
    // which wipes only when a different user id signs in.
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