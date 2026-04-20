"use client";
import { useState } from "react";
import { todayLocalISO } from "@/lib/quests";

interface DateEntryPickerProps {
  onEnter: (dateIso: string) => void | Promise<void>;
}

export default function DateEntryPicker({ onEnter }: DateEntryPickerProps) {
  const [customDate, setCustomDate] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayLocalISO();

  const enter = async (iso: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onEnter(iso);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative space-y-4">
      <div className="text-center space-y-1.5">
        <p className="text-[10px] tracking-[0.45em] text-cyan-400/80 uppercase drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
          [ Entry Timestamp ]
        </p>
        <p className="text-[11px] text-slate-500 tracking-wider">
          When did this begin?
        </p>
      </div>

      <input
        type="date"
        max={today}
        value={customDate}
        onChange={(e) => setCustomDate(e.target.value)}
        className="w-full bg-slate-900/80 border border-cyan-500/30 rounded px-3 py-2.5 text-cyan-200 text-sm text-center focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.35)] [color-scheme:dark]"
      />

      {customDate && (
        <button
          onClick={() => enter(customDate)}
          disabled={busy}
          className="relative w-full px-4 py-2.5 bg-cyan-500/20 border border-cyan-400/70 text-cyan-100 text-[11px] uppercase tracking-[0.4em] hover:bg-cyan-500/30 hover:border-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.7)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t border-l border-cyan-300" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t border-r border-cyan-300" />
          <span className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b border-l border-cyan-300" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b border-r border-cyan-300" />
          Enter Dungeon · {customDate}
        </button>
      )}
    </div>
  );
}