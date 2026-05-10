"use client";
import { useEffect } from "react";
import { savePushSubscription } from "@/app/actions/push";

const ASKED_KEY = "system:reminder-auto-asked";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Padded = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Padded);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

export default function DailyReminderAutoEnroll() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (localStorage.getItem(ASKED_KEY) === "true") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission === "denied") {
        localStorage.setItem(ASKED_KEY, "true");
        return;
      }
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          localStorage.setItem(ASKED_KEY, "true");
          return;
        }

        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        if (cancelled) return;
        localStorage.setItem(ASKED_KEY, "true");
        if (permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
        });
        const json = sub.toJSON();
        const p256dh = json.keys?.p256dh;
        const auth = json.keys?.auth;
        if (!p256dh || !auth || !sub.endpoint) return;
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
        await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh,
          auth,
          timezone,
        });
      } catch {
        // Silent, toggle in profile is the recovery path.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}