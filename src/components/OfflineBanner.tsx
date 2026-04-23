"use client";
import { useOnline } from "@/lib/offline";

export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="bg-amber-500/95 text-slate-950 py-1 text-center font-bold text-[9px] tracking-[0.4em] uppercase border-b border-amber-300 shadow-[0_1px_10px_rgba(251,191,36,0.35)]">
      ◉ Offline — Last-Synced View
    </div>
  );
}