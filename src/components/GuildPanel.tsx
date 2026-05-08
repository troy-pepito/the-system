"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveJoin,
  declineJoin,
  disbandGuild,
  leaveGuild,
  requestJoinGuild,
} from "@/app/actions/guilds";
import type { GuildDetail } from "@/lib/guilds";
import { getRankStyle } from "@/lib/rankStyle";

interface GuildPanelProps {
  initial: GuildDetail;
  slug: string;
}

/**
 * Owns the guild detail UI: header, member list, owner-only pending
 * panel, viewer-state-driven CTA (Join / Leave / Disband). All
 * mutations re-fetch via router.refresh() so the unstable_cache TAG
 * invalidation actually shows up in the DOM.
 */
export default function GuildPanel({ initial, slug }: GuildPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
          {isOwner && (
            <button
              onClick={() => {
                if (
                  confirm(
                    "Disband this guild? Every member will be ejected and the guild will be deleted. This can't be undone."
                  )
                ) {
                  runAction(async () => {
                    await disbandGuild(slug);
                    router.push("/guilds");
                  });
                }
              }}
              disabled={pending}
              className="flex-1 px-4 py-3 bg-red-500/10 border border-red-500/40 text-red-300 text-xs uppercase tracking-[0.3em] hover:bg-red-500/20 transition-all disabled:opacity-40"
            >
              Disband Guild
            </button>
          )}
        </div>
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
            return (
              <li key={m.hunterId}>
                <Link
                  href={`/h/${m.hunterId}`}
                  className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-md p-3 hover:border-cyan-500/40 transition-colors"
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
              </li>
            );
          })}
        </ul>
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
