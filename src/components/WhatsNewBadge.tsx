"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CHANGELOG_EVENT,
  hasUnseenRelease,
} from "@/lib/changelog";

export default function WhatsNewBadge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => setShow(hasUnseenRelease());
    update();
    window.addEventListener(CHANGELOG_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGELOG_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/whats-new"
      aria-label="What's new in The System"
      className="relative px-1.5 py-0.5 border border-amber-400/60 bg-amber-500/15 text-amber-300 text-[9px] tracking-[0.25em] rounded-sm hover:bg-amber-500/25 transition-colors drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
    >
      <span className="relative">NEW</span>
      <span
        aria-hidden
        className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.9)]"
      />
    </Link>
  );
}
