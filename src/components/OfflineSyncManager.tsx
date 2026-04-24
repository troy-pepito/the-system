"use client";
import { useEffect } from "react";
import { useOnline } from "@/lib/offline";
import { useQueueCount } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";

export default function OfflineSyncManager() {
  const online = useOnline();
  const queueCount = useQueueCount();

  useEffect(() => {
    if (online && queueCount > 0) {
      drainQueue().catch(() => {});
    }
  }, [online, queueCount]);

  return null;
}