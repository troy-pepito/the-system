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
import { clearPendingAvatar, getPendingAvatar } from "@/lib/pendingAvatar";
import { notifyStatsUpdated } from "@/lib/player";

export default function OfflineSyncManager() {
  const online = useOnline();
  const queueCount = useQueueCount();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    let lastFired = 0;
    const refresh = () => {
      const now = Date.now();
      if (now - lastFired < 1000) return;
      lastFired = now;
      notifyStatsUpdated();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    // Gate on a hydrated, signed-in Clerk session: mutations are
    // user-scoped server actions and 401 without auth. Re-firing on
    // user change matters when an expired session is restored mid-
    // session — without it, queued offline writes don't drain until
    // the next page nav.
    if (!online || !isLoaded || !user || queueCount === 0) return;
    drainQueue().catch(() => {});
  }, [online, queueCount, isLoaded, user]);

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

  useEffect(() => {
    if (!online || !isLoaded || !user) return;
    const pending = getQueue().filter((m) => m.type === "clerk:updateAvatar");
    if (pending.length === 0) return;
    getPendingAvatar()
      .then((blob) => {
        if (!blob) {
          removeMutations(pending.map((m) => m.id));
          return null;
        }
        return user
          .setProfileImage({ file: blob })
          .then(() => {
            removeMutations(pending.map((m) => m.id));
            return clearPendingAvatar();
          });
      })
      .catch(() => {});
  }, [online, isLoaded, user, queueCount]);

  return null;
}