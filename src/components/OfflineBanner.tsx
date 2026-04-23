"use client";
import { useUser } from "@clerk/nextjs";
import { useOnline, useKnownSignedInUserId } from "@/lib/offline";

export default function OfflineBanner() {
  const online = useOnline();
  const { isLoaded, isSignedIn } = useUser();
  const knownSignedInUserId = useKnownSignedInUserId();

  if (online) return null;

  const debug = `clerk:${isLoaded ? "loaded" : "loading"}/${isSignedIn === true ? "in" : isSignedIn === false ? "out" : "?"} flag:${knownSignedInUserId ? "set" : "unset"}`;

  return (
    <div className="bg-amber-500/95 text-slate-950 py-1 text-center border-b border-amber-300 shadow-[0_1px_10px_rgba(251,191,36,0.35)]">
      <div className="font-bold text-[9px] tracking-[0.4em] uppercase">
        ◉ Offline — Last-Synced View
      </div>
      <div className="text-[8px] font-mono opacity-70 mt-0.5">
        {debug}
      </div>
    </div>
  );
}