"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  detectInstallState,
  subscribeInstallState,
  triggerInstall,
} from "@/lib/pwaInstall";

const DISMISS_KEY = "pwa:install-dismissed";

export default function PwaInstallPrompt() {
  const { isSignedIn, isLoaded } = useUser();
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    const isAndroid = /android/.test(ua);
    if (!isIos && !isAndroid) return;

    setPlatform(isIos ? "ios" : "android");

    const evaluate = () => {
      const state = detectInstallState();
      if (state === "installed") return;
      if (state === "available" || state === "ios") setShow(true);
    };

    if (isAndroid) {
      const off = subscribeInstallState(evaluate);
      evaluate();
      return off;
    }

    // iOS has no beforeinstallprompt — show the manual instruction banner
    // after a short delay so it doesn't slap users immediately on load.
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn]);

  async function handleInstall() {
    await triggerInstall();
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  }

  if (!show || !platform) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] max-w-md mx-auto pointer-events-none">
      <div className="relative bg-slate-900/95 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.3)] p-4 pr-10 backdrop-blur pointer-events-auto">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 text-sm"
        >
          ✕
        </button>
        <p className="text-[9px] tracking-[0.4em] uppercase text-cyan-400/70 mb-2">
          [ Install ]
        </p>
        <p className="text-sm font-bold text-cyan-100 mb-2">
          Add to your home screen
        </p>
        {platform === "android" ? (
          <>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              One-tap access. No app store required.
            </p>
            <button
              onClick={handleInstall}
              className="w-full px-4 py-2.5 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.3em] hover:bg-cyan-500/30 transition-colors"
            >
              Install
            </button>
          </>
        ) : (
          <p className="text-xs text-slate-300 leading-relaxed">
            Tap the <span className="text-cyan-300 font-bold">Share</span> icon,
            then <span className="text-cyan-300 font-bold">Add to Home Screen</span>.
          </p>
        )}
      </div>
    </div>
  );
}
