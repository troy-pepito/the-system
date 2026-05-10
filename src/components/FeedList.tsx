"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getDungeon } from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
import { toggleReaction } from "@/app/actions/feed";
import type { FeedEntry, FeedPage } from "@/lib/feed";
import { REACTION_EMOJIS, type ReactionSummary } from "@/lib/reactions";
import { readCache, writeCache } from "@/lib/offlineCache";

interface FeedListProps {
  initialEntries: FeedEntry[];
  initialCursor: number | null;
  /** Fetcher driving load-more + background refresh. Required, every
   *  caller passes its own (guild-scoped fetcher today; future scopes
   *  e.g. friends-only would slot in here). */
  fetcher: (cursor?: number) => Promise<FeedPage>;
  /** Cache key for the offline localStorage stash. Different feed
   *  scopes need different keys so they don't shadow each other. */
  cacheKey: string;
}

export default function FeedList({
  initialEntries,
  initialCursor,
  fetcher,
  cacheKey,
}: FeedListProps) {
  const t = useTranslations("feed");
  const [entries, setEntries] = useState<FeedEntry[]>(initialEntries);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  // Cache-first hydration. If the SSR fetch failed (offline / DB blip)
  // we'll have empty initialEntries, read from localStorage cache to
  // surface the last-known feed. Then re-fetch fresh from the server
  // and overwrite. Same shape as Dashboard's hydration pattern.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (initialEntries.length === 0) {
      const cached = readCache<FeedEntry[]>(cacheKey);
      if (cached && cached.length > 0) setEntries(cached);
    } else {
      writeCache(cacheKey, initialEntries);
    }

    if (!navigator.onLine) return;
    fetcher()
      .then((page) => {
        setEntries(page.entries);
        setCursor(page.nextCursor);
        writeCache(cacheKey, page.entries);
      })
      .catch(() => {});
  }, [initialEntries, fetcher, cacheKey]);

  async function loadMore() {
    if (loading || cursor === null) return;
    setLoading(true);
    try {
      const page = await fetcher(cursor);
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  function applyReaction(entryId: number, emoji: string, active: boolean) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        return { ...e, reactions: nextReactions(e.reactions, emoji, active) };
      })
    );
  }

  if (entries.length === 0) {
    return (
      <div className="border border-slate-800 rounded-lg p-8 text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase text-slate-500 mb-3">
          {t("emptyTitle")}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          {t("emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {entries.map((e) => (
          <FeedCard
            key={e.id}
            entry={e}
            onReact={(emoji, active) => applyReaction(e.id, emoji, active)}
          />
        ))}
      </ul>

      {cursor !== null && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full px-4 py-3 border border-cyan-500/30 rounded text-cyan-300 text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500/10 transition-colors disabled:opacity-40"
        >
          {loading ? t("loading") : t("loadMore")}
        </button>
      )}

      {cursor === null && entries.length > 0 && (
        <p className="text-center text-[9px] tracking-[0.4em] uppercase text-slate-600 py-3">
          {t("endOfFeed")}
        </p>
      )}
    </div>
  );
}

interface FeedCardProps {
  entry: FeedEntry;
  onReact: (emoji: string, active: boolean) => void;
}

function FeedCard({ entry, onReact }: FeedCardProps) {
  const tDungeons = useTranslations("dungeons");
  const tEntryTypes = useTranslations("entryTypes");
  const tFeed = useTranslations("feed");
  const dungeonName = getDungeon(entry.dungeonId)
    ? tDungeons(`${dungeonKey(entry.dungeonId)}.name`)
    : entry.dungeonId;
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleToggle(emoji: string) {
    setPickerOpen(false);
    const wasActive =
      entry.reactions.find((r) => r.emoji === emoji)?.userReacted ?? false;
    // Optimistic flip first so the tap feels instant.
    onReact(emoji, !wasActive);
    try {
      const { active } = await toggleReaction(entry.id, emoji);
      // Server may disagree (e.g. row already existed in another tab).
      // Reconcile only if it differs from our optimistic guess.
      if (active !== !wasActive) onReact(emoji, active);
    } catch {
      // Revert on failure.
      onReact(emoji, wasActive);
    }
  }

  return (
    <li className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <Link
          href={`/h/${entry.hunterId}`}
          className="shrink-0 w-10 h-10 overflow-hidden border border-cyan-500/30 bg-slate-900 hover:border-cyan-400/60 transition-colors rounded-sm"
        >
          {entry.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.imageUrl}
              alt={entry.hunterName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-sm font-bold">
              ?
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Link
              href={`/h/${entry.hunterId}`}
              className="text-sm font-bold tracking-wider text-cyan-200 hover:text-cyan-100 truncate"
            >
              {entry.hunterName}
            </Link>
            <span className="text-[9px] tracking-[0.3em] uppercase text-slate-500 font-mono">
              {entry.date}
            </span>
            <span className="text-[10px] tracking-widest uppercase text-cyan-300/80">
              {dungeonName}
            </span>
            <span
              className={`text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm ${entryTone(entry.type)}`}
            >
              {entryLabel(entry.type, tEntryTypes)}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {entry.note}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {entry.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleToggle(r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 border rounded-full text-[11px] tabular-nums transition-colors ${
                  r.userReacted
                    ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-200"
                    : "bg-slate-800/40 border-slate-700 text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
            <ReactionPicker
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onPick={handleToggle}
              addReactionLabel={tFeed("addReaction")}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

interface ReactionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (emoji: string) => void;
  addReactionLabel: string;
}

function ReactionPicker({
  open,
  onOpenChange,
  onPick,
  addReactionLabel,
}: ReactionPickerProps) {
  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        aria-label={addReactionLabel}
        className="px-2 py-0.5 border border-slate-700 rounded-full text-slate-300 text-[11px] hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
      >
        +
      </button>
      {open && (
        <>
          {/* Click-outside backdrop */}
          <div
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-30"
          />
          <div className="absolute bottom-full left-0 mb-1 z-40 flex gap-1 bg-slate-900 border border-cyan-500/30 rounded-full px-2 py-1 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            {REACTION_EMOJIS.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onPick(r.emoji)}
                title={r.label}
                className="px-1.5 py-1 hover:scale-125 transition-transform text-base"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function nextReactions(
  current: ReactionSummary[],
  emoji: string,
  active: boolean
): ReactionSummary[] {
  const existing = current.find((r) => r.emoji === emoji);
  if (!existing) {
    return active
      ? [...current, { emoji, count: 1, userReacted: true }]
      : current;
  }
  // Only the viewer's own toggle moves the count, other hunters'
  // reactions are immutable from the client's perspective.
  const delta =
    active && !existing.userReacted
      ? 1
      : !active && existing.userReacted
      ? -1
      : 0;
  return current
    .map((r) =>
      r.emoji === emoji
        ? { ...r, count: r.count + delta, userReacted: active }
        : r
    )
    .filter((r) => r.count > 0);
}

function entryLabel(
  type: string,
  t: (key: string) => string
): string {
  if (type === "relapse" || type === "completed" || type === "journal") {
    return t(type);
  }
  return type.replace(/-/g, " ");
}

function entryTone(type: string): string {
  if (type === "relapse")
    return "text-red-300 border-red-500/40 bg-red-500/10";
  if (type === "completed")
    return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  if (type === "journal")
    return "text-slate-300 border-slate-600 bg-slate-800/60";
  return "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";
}
