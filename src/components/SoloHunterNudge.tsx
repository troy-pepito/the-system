"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { getMyGuild } from "@/app/actions/guilds";

/**
 * Banner shown on the dashboard when a hunter has been signed up for
 * 3+ days but hasn't joined a guild yet. Solo hunters churn far faster
 * than guild members — surfacing the band concept early is the single
 * highest-leverage retention nudge for this app.
 *
 * Dismissable, capped at 2 dismissals (after that, the hunter has made
 * a clear decision to hunt alone and we stop nagging). Dismissal count
 * is stored in localStorage so it's per-device, which is fine — the
 * worst case is showing the banner once on a new device.
 *
 * Renders nothing until the client-side checks complete, so SSR and
 * first paint stay clean.
 */
const DISMISSAL_KEY = "system:solo-nudge-dismissals";
const MAX_DISMISSALS = 2;
const DAYS_THRESHOLD = 3;

function readDismissals(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(DISMISSAL_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function bumpDismissals() {
  if (typeof window === "undefined") return;
  try {
    const next = readDismissals() + 1;
    localStorage.setItem(DISMISSAL_KEY, String(next));
  } catch {}
}

export default function SoloHunterNudge() {
  const { user, isLoaded } = useUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !user?.createdAt) return;

    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceSignup < DAYS_THRESHOLD) return;
    if (readDismissals() >= MAX_DISMISSALS) return;

    getMyGuild()
      .then((guild) => {
        if (cancelled) return;
        if (!guild) setShow(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  if (!show) return null;

  function dismiss() {
    bumpDismissals();
    setShow(false);
  }

  return (
    <div className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.2),inset_0_0_12px_rgba(34,211,238,0.05)] p-5">
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-cyan-400/50 hover:text-cyan-300 text-sm leading-none w-6 h-6 flex items-center justify-center"
      >
        ×
      </button>

      <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-2">
        [ SYSTEM NOTICE ]
      </p>
      <p className="text-sm text-cyan-100 leading-relaxed pr-6">
        You hunt alone. Bands of hunters last longer than lone wolves.
      </p>
      <Link
        href="/guilds"
        className="inline-block mt-3 px-4 py-2 bg-cyan-500/20 border border-cyan-400/60 text-cyan-100 text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500/40 transition-colors"
      >
        Find your band →
      </Link>
    </div>
  );
}
