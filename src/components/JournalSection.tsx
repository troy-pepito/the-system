"use client";
import Link from "next/link";
import { useState } from "react";
import Card from "@/components/Card";
import NoteModal from "@/components/NoteModal";
import {
  deleteJournalEntry,
  updateJournalEntry,
  type JournalEntry,
} from "@/app/actions/dungeons";
import { getDungeon } from "@/lib/dungeons";

interface JournalSectionProps {
  entries: JournalEntry[];
  onEntriesChange: (next: JournalEntry[]) => void;
  /** When set, only the first N entries render — used by the profile
   *  preview. The full archive (no limit) lives on /journal. */
  previewLimit?: number;
  /** When previewLimit is set and total entries exceed it, this href
   *  is rendered as a "See all" link. */
  seeAllHref?: string;
  /** Title text for the card. Defaults to "Journal". */
  title?: string;
}

export default function JournalSection({
  entries,
  onEntriesChange,
  previewLimit,
  seeAllHref,
  title = "Journal",
}: JournalSectionProps) {
  const visible =
    typeof previewLimit === "number"
      ? entries.slice(0, previewLimit)
      : entries;
  const groups = groupEntriesByDate(visible);
  const overflow =
    typeof previewLimit === "number"
      ? Math.max(0, entries.length - previewLimit)
      : 0;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null
  );

  const editingEntry = entries.find((e) => e.id === editingId) ?? null;

  async function handleEditSubmit(note: string | null, isPublic?: boolean) {
    setEditingId(null);
    if (!editingEntry || !note) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    const nextIsPublic = isPublic ?? false;
    onEntriesChange(
      entries.map((e) =>
        e.id === editingEntry.id
          ? { ...e, note: trimmed, isPublic: nextIsPublic }
          : e
      )
    );
    try {
      await updateJournalEntry(editingEntry.id, trimmed, nextIsPublic);
    } catch {
      // Best-effort — server is the source of truth on next refresh.
    }
  }

  async function handleConfirmDelete(id: number) {
    setConfirmingDeleteId(null);
    onEntriesChange(entries.filter((e) => e.id !== id));
    try {
      await deleteJournalEntry(id);
    } catch {
      // Best-effort — entry restored on next refresh if server fails.
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
          {title}
        </p>
        {entries.length > 0 && (
          <p className="text-[10px] text-slate-500 tracking-wider">
            {entries.length}{" "}
            {entries.length === 1 ? "entry" : "entries"} ·{" "}
            {groupEntriesByDate(entries).length}{" "}
            {groupEntriesByDate(entries).length === 1 ? "day" : "days"}
          </p>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 leading-relaxed">
          No entries yet. When you relapse, log a coffee, or mark an exposure,
          you&apos;ll be asked if you want to write a note — skip or save, your
          call.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, dayEntries]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[11px] tracking-[0.3em] uppercase text-cyan-300 font-bold drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
                  {relativeDateLabel(date)}
                </p>
                <div className="flex-1 h-px bg-cyan-500/20" />
                <p className="text-[9px] text-slate-600 font-mono">{date}</p>
              </div>
              <ul className="space-y-3">
                {dayEntries.map((e) => {
                  const dungeon = getDungeon(e.dungeonId);
                  const isConfirmingDelete = confirmingDeleteId === e.id;
                  return (
                    <li
                      key={e.id}
                      className="border-l-2 border-cyan-500/30 pl-3 py-0.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] tracking-widest uppercase text-cyan-300/80">
                          {dungeon?.name ?? e.dungeonId}
                        </span>
                        <span
                          className={`text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm ${eventTone(e.type)}`}
                        >
                          {eventLabel(e.type)}
                        </span>
                        {e.isPublic && (
                          <span className="text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border rounded-sm text-cyan-300 border-cyan-400/40 bg-cyan-500/5">
                            ◉ Public
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {e.note}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {isConfirmingDelete ? (
                          <>
                            <span className="text-[10px] tracking-widest uppercase text-red-400/80">
                              Delete this entry?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(e.id)}
                              className="text-[10px] tracking-widest uppercase text-red-300 hover:text-red-200 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingId(e.id)}
                              className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-cyan-300 transition-colors"
                            >
                              Edit
                            </button>
                            <span className="text-slate-700 text-[10px]">·</span>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(e.id)}
                              className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {overflow > 0 && seeAllHref && (
        <div className="mt-5 pt-4 border-t border-slate-800/60 text-center">
          <Link
            href={seeAllHref}
            className="text-[11px] tracking-[0.3em] uppercase text-cyan-400/80 hover:text-cyan-200 transition-colors"
          >
            See all {entries.length} entries →
          </Link>
        </div>
      )}

      <NoteModal
        open={editingEntry !== null}
        title={`Edit Journal — ${getDungeon(editingEntry?.dungeonId ?? "")?.name ?? ""}`}
        placeholder="Edit your reflection…"
        confirmLabel="Save"
        skipLabel="Cancel"
        cancelOnSkip
        showPublicToggle
        initialNote={editingEntry?.note ?? ""}
        initialIsPublic={editingEntry?.isPublic ?? false}
        onSubmit={handleEditSubmit}
        onCancel={() => setEditingId(null)}
      />
    </Card>
  );
}

function eventLabel(type: string): string {
  if (type === "relapse") return "Relapse";
  if (type === "completed") return "Completed";
  if (type === "journal") return "Journal";
  return type.replace(/-/g, " ");
}

function eventTone(type: string): string {
  if (type === "relapse") return "text-red-300 border-red-500/40 bg-red-500/10";
  if (type === "completed")
    return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  if (type === "journal")
    return "text-slate-300 border-slate-600 bg-slate-800/60";
  return "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";
}

function relativeDateLabel(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${iso}T00:00:00`);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupEntriesByDate(
  entries: JournalEntry[]
): Array<[string, JournalEntry[]]> {
  const map = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return Array.from(map.entries());
}
