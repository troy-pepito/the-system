"use client";

import { useEffect, useRef, useState } from "react";
import FriendActions from "@/components/FriendActions";
import InviteToGuildAction from "@/components/InviteToGuildAction";

interface Props {
  hunterId: string;
}

/**
 * Kebab dropdown that consolidates the friend + invite actions on
 * the public hunter card. The Hunter ID header used to show two
 * compact pills side-by-side, which felt busy and competed for
 * visual weight with the rank/level numbers. Hiding them inside a
 * three-dot menu keeps the header clean and lets each action render
 * at full size with proper labels when expanded.
 *
 * Pattern is borrowed from GuildPanel's kebab (member view): three
 * stacked dots, click toggles a panel anchored top-right, outside-
 * click and Escape both close it.
 */
export default function HunterActionsMenu({ hunterId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Hunter actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex flex-col items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60 transition-colors"
      >
        <span className="block w-1 h-1 rounded-full bg-current mb-0.5" />
        <span className="block w-1 h-1 rounded-full bg-current mb-0.5" />
        <span className="block w-1 h-1 rounded-full bg-current" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-1.5 min-w-[180px] p-3 bg-slate-900/95 border border-slate-700 rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 flex flex-col gap-2"
        >
          <FriendActions hunterId={hunterId} variant="default" />
          <InviteToGuildAction hunterId={hunterId} variant="default" />
        </div>
      )}
    </div>
  );
}
