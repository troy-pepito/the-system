"use client";
import { useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/actions/push";

type Status =
  | "loading"
  | "unsupported"
  | "denied"
  | "off"
  | "on"
  | "working";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Padded = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Padded);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

export default function NotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError("Push notifications not configured.");
      return;
    }
    setStatus("working");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      await reg.update().catch(() => {});

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe().catch(() => {});
        await removePushSubscription(existing.endpoint).catch(() => {});
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!p256dh || !auth || !sub.endpoint) {
        throw new Error("Incomplete subscription");
      }
      await savePushSubscription({ endpoint: sub.endpoint, p256dh, auth });
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable");
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("working");
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe().catch(() => {});
        await removePushSubscription(sub.endpoint);
      }
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable");
      setStatus("on");
    }
  }

  const enabled = status === "on";
  const working = status === "working" || status === "loading";
  const hardDisabled = status === "unsupported" || status === "denied";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 uppercase tracking-wider">
            Daily Reminder
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            {status === "unsupported"
              ? "This browser doesn't support push notifications."
              : status === "denied"
                ? "Notifications are blocked. Re-enable in your browser/OS settings."
                : "Get a nudge when the day resets so you don't miss your quests."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={enabled ? disable : enable}
          disabled={working || hardDisabled}
          className={`shrink-0 relative w-14 h-7 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            enabled
              ? "bg-cyan-500/25 border-cyan-400/60 shadow-[0_0_14px_rgba(34,211,238,0.4)]"
              : "bg-slate-900 border-slate-700"
          }`}
        >
          <span
            className={`absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all duration-200 ease-out ${
              enabled
                ? "left-[31px] bg-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                : "left-[3px] bg-slate-400"
            }`}
          />
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-red-400 tracking-wider mt-2">{error}</p>
      )}
    </div>
  );
}