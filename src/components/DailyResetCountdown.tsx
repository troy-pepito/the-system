"use client";
import { useEffect, useState } from "react";

// Countdown to the next local midnight, when daily quests reset. Drawn
// as a discreet HH:MM:SS strip in the DailyQuests header so the player
// can feel the window closing. Isolated as its own component so the
// per-second tick doesn't re-render the whole quest list.

function msUntilLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function format(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

export default function DailyResetCountdown({
  label,
  urgent = false,
}: {
  label: string;
  urgent?: boolean;
}) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    // Initial set on mount runs the clock immediately. Lazy initializer
    // would call msUntilLocalMidnight() during SSR (Date.now mismatches
    // between server and client) and force a hydration warning. Setting
    // here instead keeps SSR rendering null and the client paints the
    // first frame with the correct time, no flicker, no mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMs(msUntilLocalMidnight());
    const id = setInterval(() => setMs(msUntilLocalMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  if (ms === null) return null;
  const { h, m, s } = format(ms);
  // Last-hour urgency: amber/red flash. Otherwise quiet cyan.
  const lastHour = ms < 60 * 60 * 1000;
  const tone = urgent || lastHour ? "text-amber-300" : "text-cyan-300/80";

  return (
    <div className="flex items-center justify-center gap-2 mt-1">
      <span className="text-[9px] tracking-[0.4em] uppercase text-slate-500">
        {label}
      </span>
      <span
        className={`text-[10px] font-mono tabular-nums tracking-wider ${tone}`}
      >
        {h}:{m}:{s}
      </span>
    </div>
  );
}
