"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveJoin,
  declineJoin,
  disbandGuild,
  editGuild,
  getGuildFeed,
  kickMember,
  leaveGuild,
  requestJoinGuild,
  transferOwnership,
} from "@/app/actions/guilds";
import type { FeedEntry } from "@/lib/feed";
import FeedList from "@/components/FeedList";
import type { GuildDetail } from "@/lib/guilds";
import { getRankStyle } from "@/lib/rankStyle";

interface GuildPanelProps {
  initial: GuildDetail;
  slug: string;
  initialFeed: FeedEntry[];
  initialFeedCursor: number | null;
}

/**
 * Owns the guild detail UI: header, member list, owner-only pending
 * panel, viewer-state-driven CTA (Join / Leave / Disband). All
 * mutations re-fetch via router.refresh() so the unstable_cache TAG
 * invalidation actually shows up in the DOM.
 */
export default function GuildPanel({
  initial,
  slug,
  initialFeed,
  initialFeedCursor,
}: GuildPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const guild = initial;

  function runAction(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const isOwner = guild.viewerStatus === "owner";
  const isMember = guild.viewerStatus === "member";
  const isPending = guild.viewerStatus === "pending";
  const isStranger = guild.viewerStatus === "none";

  return (
    <div className="space-y-6">
      <Link
        href="/guilds"
        className="inline-flex items-center text-[10px] tracking-[0.3em] uppercase text-slate-500 hover:text-cyan-300 transition-colors"
      >
        ← All Guilds
      </Link>

      <div className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.05)] p-6 space-y-3">
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

        {isOwner && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="Edit guild"
            title="Edit guild"
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <span className="text-base leading-none" aria-hidden>
              ✎
            </span>
          </button>
        )}

        <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70">
          Guild
        </p>
        <p className="font-display text-2xl font-bold uppercase tracking-wider text-cyan-100">
          {guild.name}
        </p>
        {guild.description && (
          <p className="text-sm text-slate-300 leading-relaxed">
            {guild.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-[10px] tracking-widest uppercase text-slate-400 pt-2">
          <span>{guild.memberCount} / 50 members</span>
          {isOwner && <span className="text-cyan-300/80">You're the owner</span>}
          {isMember && <span className="text-cyan-300/80">You're a member</span>}
          {isPending && <span className="text-amber-300/80">Request pending</span>}
        </div>

        {error && (
          <p className="text-xs text-red-400 leading-relaxed pt-1">{error}</p>
        )}

        {!isOwner && (
          <div className="flex gap-2 pt-2">
            {isStranger && (
              <button
                onClick={() => runAction(() => requestJoinGuild(slug))}
                disabled={pending || guild.memberCount >= 50}
                className="flex-1 px-4 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.3em] hover:bg-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guild.memberCount >= 50
                  ? "Guild Full"
                  : pending
                  ? "Sending…"
                  : "Request to Join"}
              </button>
            )}
            {isPending && (
              <p className="flex-1 px-4 py-3 border border-amber-400/40 text-amber-300/80 text-xs uppercase tracking-[0.3em] text-center">
                Awaiting Owner Approval
              </p>
            )}
            {isMember && (
              <button
                onClick={() => runAction(leaveGuild)}
                disabled={pending}
                className="flex-1 px-4 py-3 bg-red-500/10 border border-red-500/40 text-red-300 text-xs uppercase tracking-[0.3em] hover:bg-red-500/20 transition-all disabled:opacity-40"
              >
                {pending ? "Leaving…" : "Leave Guild"}
              </button>
            )}
          </div>
        )}
      </div>

      {isOwner && guild.pending.length > 0 && (
        <div className="bg-slate-900/60 border border-amber-400/40 rounded-lg p-5 space-y-3 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-amber-300/80">
            Pending Requests · {guild.pending.length}
          </p>
          <ul className="space-y-2">
            {guild.pending.map((p) => (
              <li
                key={p.hunterId}
                className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-md p-3"
              >
                <HunterAvatar imageUrl={p.imageUrl} name={p.hunterName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cyan-100 truncate font-bold tracking-wider">
                    {p.hunterName}
                  </p>
                  <p className="text-[10px] text-slate-500 tracking-widest uppercase">
                    Lvl {p.level} · {p.rank}
                  </p>
                </div>
                <button
                  onClick={() =>
                    runAction(() => approveJoin(slug, p.hunterId))
                  }
                  disabled={pending}
                  className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-[10px] uppercase tracking-[0.2em] hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    runAction(() => declineJoin(slug, p.hunterId))
                  }
                  disabled={pending}
                  className="px-3 py-1.5 border border-slate-700 text-slate-400 text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800/60 transition-colors disabled:opacity-40"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-3">
          Members
        </p>
        <ul className="space-y-2">
          {guild.members.map((m) => {
            const rankStyle = getRankStyle(m.rank);
            const canKick = isOwner && m.hunterId !== guild.ownerId;
            return (
              <li
                key={m.hunterId}
                className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-md p-3 hover:border-cyan-500/40 transition-colors"
              >
                <Link
                  href={`/h/${m.hunterId}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <HunterAvatar imageUrl={m.imageUrl} name={m.hunterName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-cyan-100 truncate font-bold tracking-wider">
                      {m.hunterName}
                      {m.hunterId === guild.ownerId && (
                        <span className="ml-2 text-[9px] tracking-[0.2em] uppercase text-amber-300">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] tracking-widest uppercase text-slate-500">
                      Lvl {m.level} ·{" "}
                      <span className={rankStyle.text}>{m.rank}</span>
                    </p>
                  </div>
                  <p className="text-[10px] tracking-widest uppercase text-cyan-400/70 tabular-nums shrink-0">
                    {m.weeklyActivityPoints} pts
                  </p>
                </Link>
                {canKick && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Kick ${m.hunterName} from the guild? They can request to rejoin later.`
                        )
                      ) {
                        runAction(() => kickMember(slug, m.hunterId));
                      }
                    }}
                    disabled={pending}
                    title="Kick from guild"
                    className="shrink-0 px-2 py-1 text-[9px] tracking-[0.2em] uppercase text-red-400/70 border border-red-500/30 rounded hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    Kick
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {(isOwner || isMember) && (
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-3">
            Guild Feed
          </p>
          {initialFeed.length === 0 ? (
            <div className="border border-slate-800 rounded-lg p-6 text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                Nothing here yet. Members' public journal entries land in this
                feed — flip the Share toggle on a journal to drop one in.
              </p>
            </div>
          ) : (
            <FeedList
              initialEntries={initialFeed}
              initialCursor={initialFeedCursor}
              fetcher={(c) => getGuildFeed(slug, c)}
              cacheKey={`guild-feed-${slug}`}
            />
          )}
        </div>
      )}

      {isOwner && (
        <EditGuildModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          guild={guild}
          slug={slug}
          onSaved={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface EditGuildModalProps {
  open: boolean;
  onClose: () => void;
  guild: GuildDetail;
  slug: string;
  onSaved: () => void;
}

function EditGuildModal({
  open,
  onClose,
  guild,
  slug,
  onSaved,
}: EditGuildModalProps) {
  const router = useRouter();
  const [name, setName] = useState(guild.name);
  const [description, setDescription] = useState(guild.description ?? "");
  const [transferTo, setTransferTo] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // Members eligible for ownership transfer = accepted members minus
  // the current owner. The dropdown is empty when the owner is solo,
  // which is correct — there's no one to transfer to.
  const transferCandidates = guild.members.filter(
    (m) => m.hunterId !== guild.ownerId
  );

  const dirty =
    name.trim() !== guild.name ||
    description.trim() !== (guild.description ?? "");

  function saveDetails() {
    setError(null);
    startTransition(async () => {
      try {
        await editGuild(slug, { name, description });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save changes");
      }
    });
  }

  function transfer() {
    if (!transferTo) return;
    const target = guild.members.find((m) => m.hunterId === transferTo);
    if (!target) return;
    if (
      !confirm(
        `Transfer ownership to ${target.hunterName}? You'll become a regular member and can't undo this without their cooperation.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await transferOwnership(slug, transferTo);
        onSaved();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not transfer ownership"
        );
      }
    });
  }

  function disband() {
    if (
      !confirm(
        `Disband ${guild.name}? Every member will be ejected and the guild will be deleted. This can't be undone.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await disbandGuild(slug);
        // Hard navigate — the guild is gone, so the current /g/{slug}
        // route would 404 if we just refreshed.
        router.push("/guilds");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disband");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Outer frame: holds corners + X button. Stays overflow-visible
          so the negative-offset chrome doesn't get clipped — the bug
          that produced the cut-off X and stray scrollbars before. */}
      <div
        className="relative w-full max-w-lg bg-slate-900/95 border border-cyan-400/40 shadow-[0_0_50px_rgba(34,211,238,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-950 border border-cyan-400/60 text-cyan-300 text-sm leading-none hover:brightness-150 transition-all shadow-md"
        >
          ✕
        </button>

        {/* Inner scroll container — only this scrolls when content
            exceeds the viewport. Outer frame stays put, X stays
            clickable, corners stay visible. */}
        <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-800">
            <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-1">
              Manage Guild
            </p>
            <p className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">
              {guild.name}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              /g/{slug} <span className="text-slate-700">· slug locked</span>
            </p>
          </div>

          {/* Details section */}
          <section className="px-6 py-5 border-b border-slate-800 space-y-4">
            <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70">
              Details
            </p>
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-400/60 focus:outline-none text-sm text-slate-200 px-3 py-2 rounded-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                rows={3}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-400/60 focus:outline-none text-sm text-slate-200 px-3 py-2 resize-none leading-relaxed rounded-sm"
              />
            </div>
            <button
              type="button"
              onClick={saveDetails}
              disabled={pending || !dirty || name.trim().length < 3}
              className="w-full px-4 py-2.5 bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-sm"
            >
              {pending ? "Saving…" : dirty ? "Save Changes" : "No Changes"}
            </button>
          </section>

          {/* Transfer Ownership section */}
          {transferCandidates.length > 0 ? (
            <section className="px-6 py-5 border-b border-slate-800 space-y-3">
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-amber-300/80">
                  Transfer Ownership
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
                  Hand the guild over to another member. You'll become a regular
                  member; only they can transfer it back.
                </p>
              </div>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-amber-400/60 focus:outline-none text-sm text-slate-200 px-3 py-2 rounded-sm"
              >
                <option value="">Select a new owner…</option>
                {transferCandidates.map((m) => (
                  <option key={m.hunterId} value={m.hunterId}>
                    {m.hunterName} (Lvl {m.level})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={transfer}
                disabled={pending || !transferTo}
                className="w-full px-4 py-2.5 bg-amber-500/15 border border-amber-400/50 text-amber-200 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-sm"
              >
                {pending ? "Transferring…" : "Transfer Ownership"}
              </button>
            </section>
          ) : null}

          {/* Danger Zone */}
          <section className="px-6 py-5 space-y-3 bg-red-500/[0.03]">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-red-400/80">
                Danger Zone
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
                Permanently deletes the guild and ejects every member. The slug
                becomes available for someone else to claim.
              </p>
            </div>
            <button
              type="button"
              onClick={disband}
              disabled={pending}
              className="w-full px-4 py-2.5 bg-red-500/10 border border-red-500/40 text-red-300 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-red-500/20 transition-colors disabled:opacity-40 rounded-sm"
            >
              {pending ? "Disbanding…" : "Disband Guild"}
            </button>
          </section>

          {error && (
            <p className="text-xs text-red-400 leading-relaxed px-6 pb-5">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HunterAvatar({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  return (
    <div className="shrink-0 w-9 h-9 overflow-hidden border border-cyan-500/30 bg-slate-900 rounded-sm">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-sm font-bold">
          ?
        </div>
      )}
    </div>
  );
}
