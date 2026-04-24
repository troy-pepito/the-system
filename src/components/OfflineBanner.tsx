"use client";
import { useOnline } from "@/lib/offline";
import { useQueueCount } from "@/lib/offlineQueue";

export default function OfflineBanner() {
  const online = useOnline();
  const queueCount = useQueueCount();

  if (online && queueCount === 0) return null;

  const label = online
    ? `◉ Syncing — ${queueCount} Pending`
    : queueCount > 0
      ? `◉ Offline — ${queueCount} Pending Sync`
      : "◉ Offline — Last-Synced View";

  return (
    <div className="bg-amber-500/95 text-slate-950 py-1 text-center font-bold text-[9px] tracking-[0.4em] uppercase border-b border-amber-300 shadow-[0_1px_10px_rgba(251,191,36,0.35)]">
      {label}
    </div>
  );
}