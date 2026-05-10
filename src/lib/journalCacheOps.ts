import { readCache, writeCache } from "@/lib/offlineCache";
import type { JournalEntry } from "@/app/actions/dungeons";

export const JOURNAL_CACHE_KEY = "journal";

/**
 * Optimistically prepend a journal entry to the cached list so the
 * Profile page's journal section reflects it instantly. Used when:
 *  - Offline: server never received the entry; without this, the
 *    user submits a note and sees nothing change anywhere, looks
 *    like the entry vanished. Real bug Troy hit on 2026-05-08.
 *  - Online: saves a round trip; the next server refetch overwrites
 *    this temp row with the authoritative version.
 *
 * Temp id is negative so it never collides with real Postgres
 * autoincrement ids, the JournalSection can detect that to mark it
 * "pending" if we ever want to surface that visually.
 */
export function injectPendingJournalEntry(opts: {
  dungeonId: string;
  type?: string;
  note: string;
  isPublic?: boolean;
}): void {
  const entry: JournalEntry = {
    id: -Date.now(),
    dungeonId: opts.dungeonId,
    type: opts.type ?? "journal",
    date: new Date().toISOString().split("T")[0],
    note: opts.note,
    isPublic: opts.isPublic ?? false,
    createdAt: new Date().toISOString(),
  };
  const existing = readCache<JournalEntry[]>(JOURNAL_CACHE_KEY) ?? [];
  writeCache(JOURNAL_CACHE_KEY, [entry, ...existing]);
}
