"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useOnline } from "@/lib/offline";
import {
  getQueue,
  removeMutations,
  useQueueCount,
} from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";

export default function OfflineSyncManager() {
  const online = useOnline();
  const queueCount = useQueueCount();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (online && queueCount > 0) {
      drainQueue().catch(() => {});
    }
  }, [online, queueCount]);

  useEffect(() => {
    if (!online || !isLoaded || !user) return;
    const pending = getQueue().filter(
      (m) => m.type === "clerk:updateHunterName"
    );
    if (pending.length === 0) return;
    const latest = pending[pending.length - 1];
    if (latest.type !== "clerk:updateHunterName") return;
    user
      .update({
        unsafeMetadata: { ...user.unsafeMetadata, hunterName: latest.hunterName },
      })
      .then(() => {
        removeMutations(pending.map((m) => m.id));
      })
      .catch(() => {});
  }, [online, isLoaded, user, queueCount]);

  return null;
}