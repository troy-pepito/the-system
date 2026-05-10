"use client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const EVENT = "pwa:install-state-changed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerAttached = false;

function attachListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(EVENT));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(EVENT));
  });
}
attachListener();

export type InstallState =
  | "loading"
  | "installed"
  | "ios"
  | "available"
  | "unsupported";

export function detectInstallState(): InstallState {
  if (typeof window === "undefined") return "loading";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";

  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
  if (isIos) return "ios";

  return deferredPrompt ? "available" : "unsupported";
}

export async function triggerInstall(): Promise<
  "accepted" | "dismissed" | "no-prompt"
> {
  if (!deferredPrompt) return "no-prompt";
  await deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  window.dispatchEvent(new Event(EVENT));
  return result.outcome;
}

export function subscribeInstallState(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/**
 * Backwards-compatible helper for the auto-popup banner, returns the
 * current deferred prompt if any.
 */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}
