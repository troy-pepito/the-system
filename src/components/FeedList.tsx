"use client";
import { useState } from "react";
import Link from "next/link";
import { getDungeon } from "@/lib/dungeons";
import { getPublicFeed, type FeedEntry } from "@/app/actions/feed";

interface FeedListProps {
  initialEntries: FeedEntry[];
  initialCursor: number | null;
}

export default function FeedList({
  initialEntries,
  initialCursor,
}: FeedListProps) {
  const [entries, setEntries] = useState<FeedEntry[]>(initialEntries);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading || cursor === null) return;
    setLoading(true);
    try {
      const page = await getPublicFeed(cursor);
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="border border-slate-800 rounded-lg p-8 text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase text-slate-500 mb-3">
          [ No Reflections Yet ]
        </p>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          When hunters mark their journal entries public, they&apos;ll appear
          here. Be the first — open a dungeon, log a note, toggle public.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {entries.map((e) => (
          <FeedCard key={e.id} entry={e} />
        ))}
      </ul>

      {cursor !== null && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full px-4 py-3 border border-cyan-500/30 rounded text-cyan-300 text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500/10 transition-colors disabled:opacity-40"
        >
          {loading ? "Loading…" : "Load More"}
        </button>
      )}

      {cursor === null && entries.length > 0 && (
        <p className="text-center text-[9px] tracking-[0.4em] uppercase text-slate-600 py-3">
          — End of Feed —
        </p>
      )}
    </div>
  );
}

function FeedCard({ entry }: { entry: FeedEntry }) {
  const dungeon = getDungeon(entry.dungeonId);

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
              {dungeon?.name ?? entry.dungeonId}
            </span>
            <span
              className={`text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm ${entryTone(entry.type)}`}
            >
              {entryLabel(entry.type)}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {entry.note}
          </p>
        </div>
      </div>
    </li>
  );
}

function entryLabel(type: string): string {
  if (type === "relapse") return "Relapse";
  if (type === "completed") return "Completed";
  if (type === "journal") return "Journal";
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
