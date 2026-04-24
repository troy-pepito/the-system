import { useEffect, useState } from "react";

const DB_NAME = "shivaliva-offline";
const DB_VERSION = 1;
const STORE = "pendingAvatar";
const KEY = "avatar";
const EVENT = "shivaliva:pending-avatar-change";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingAvatar(blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event(EVENT));
}

export async function getPendingAvatar(): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingAvatar(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new Event(EVENT));
}

export function usePendingAvatarUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;

    const load = () => {
      getPendingAvatar()
        .then((blob) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = null;
          }
          if (blob) {
            currentUrl = URL.createObjectURL(blob);
            setUrl(currentUrl);
          } else {
            setUrl(null);
          }
        })
        .catch(() => setUrl(null));
    };

    load();
    window.addEventListener(EVENT, load);
    return () => {
      window.removeEventListener(EVENT, load);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, []);

  return url;
}