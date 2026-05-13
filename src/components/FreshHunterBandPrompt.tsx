"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { getMyGuild } from "@/app/actions/guilds";

/**
 * First-impression welcome banner shown on the dashboard during a
 * hunter's first 0-2 days, if they haven't joined a guild yet.
 * Pairs with SoloHunterNudge (days 3+) — together they keep the band
 * concept visible across the critical first week.
 *
 * Tone is welcoming, not corrective. Day 3+ uses the harder "System
 * notes you hunt alone" framing; this one just says "your call,
 * here's the option."
 */
const DISMISSAL_KEY = "system:fresh-band-prompt-dismissed";
const FRESH_DAYS_MAX = 3;

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISSAL_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISSAL_KEY, "1");
  } catch {}
}

export default function FreshHunterBandPrompt() {
  const { user, isLoaded } = useUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !user?.createdAt) return;

    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceSignup >= FRESH_DAYS_MAX) return;
    if (isDismissed()) return;

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
    markDismissed();
    setShow(false);
  }

  return (
    <div className="relative bg-slate-950/80 border border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.2),inset_0_0_12px_rgba(251,191,36,0.05)] p-5">
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-amber-400/50 hover:text-amber-300 text-sm leading-none w-6 h-6 flex items-center justify-center"
      >
        ×
      </button>

      <p className="text-[10px] tracking-[0.4em] uppercase text-amber-400/80 mb-2">
        [ HUNTER WELCOMED ]
      </p>
      <p className="text-sm text-amber-100 leading-relaxed pr-6">
        You can hunt alone or bind to a band. Hunters in a band push each other through the early ranks.
      </p>
      <Link
        href="/guilds"
        className="inline-block mt-3 px-4 py-2 bg-amber-500/20 border border-amber-400/60 text-amber-100 text-[10px] uppercase tracking-[0.3em] hover:bg-amber-500/40 transition-colors"
      >
        Browse bands →
      </Link>
    </div>
  );
}
