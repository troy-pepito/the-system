"use client";

import { useEffect, useState } from "react";
import {
  acceptGuildInvite,
  declineGuildInvite,
  getMyPendingInvites,
  type PendingInvite,
} from "@/app/actions/guilds";

/**
 * Dashboard surface for invites the viewer has received from guild
 * owners. Renders one card per pending invite with Accept / Decline
 * buttons. Hidden when there are no pending invites — no layout
 * impact for the common case.
 *
 * On accept: row vanishes (the viewer is now an "accepted" member).
 * On decline: row vanishes (the invite row is deleted). Errors are
 * shown inline per-invite.
 */
export default function PendingInvitesBanner() {
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    getMyPendingInvites()
      .then((list) => {
        if (cancelled) return;
        setInvites(list);
      })
      .catch(() => {
        if (!cancelled) setInvites([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!invites || invites.length === 0) return null;

  async function handleAccept(invite: PendingInvite) {
    if (busyId !== null) return;
    setBusyId(invite.guildId);
    setErrorMap((prev) => ({ ...prev, [invite.guildId]: "" }));
    try {
      await acceptGuildInvite(invite.guildId);
      setInvites((prev) =>
        (prev ?? []).filter((i) => i.guildId !== invite.guildId)
      );
    } catch (e) {
      setErrorMap((prev) => ({
        ...prev,
        [invite.guildId]:
          e instanceof Error ? e.message : "Couldn't accept invite",
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(invite: PendingInvite) {
    if (busyId !== null) return;
    setBusyId(invite.guildId);
    setErrorMap((prev) => ({ ...prev, [invite.guildId]: "" }));
    try {
      await declineGuildInvite(invite.guildId);
      setInvites((prev) =>
        (prev ?? []).filter((i) => i.guildId !== invite.guildId)
      );
    } catch (e) {
      setErrorMap((prev) => ({
        ...prev,
        [invite.guildId]:
          e instanceof Error ? e.message : "Couldn't decline invite",
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const busy = busyId === invite.guildId;
        const error = errorMap[invite.guildId];
        return (
          <div
            key={invite.guildId}
            className="relative bg-slate-950/80 border border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2),inset_0_0_12px_rgba(251,191,36,0.05)] p-5"
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300 pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300 pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

            <p className="text-[10px] tracking-[0.4em] uppercase text-amber-400/80 mb-2">
              [ GUILD INVITE ]
            </p>
            <p className="font-display text-base font-bold uppercase tracking-wider text-amber-100">
              {invite.name}
            </p>
            {invite.description && (
              <p className="text-xs text-slate-300 leading-relaxed mt-1.5 line-clamp-2">
                {invite.description}
              </p>
            )}
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mt-2">
              {invite.memberCount} members
            </p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleAccept(invite)}
                disabled={busy}
                className="flex-1 px-4 py-2 bg-amber-500/20 border border-amber-400/60 text-amber-100 text-[10px] uppercase tracking-[0.3em] hover:bg-amber-500/40 transition-colors disabled:opacity-50"
              >
                {busy ? "..." : "Accept"}
              </button>
              <button
                onClick={() => handleDecline(invite)}
                disabled={busy}
                className="flex-1 px-4 py-2 border border-slate-700 text-slate-400 text-[10px] uppercase tracking-[0.3em] hover:text-slate-200 hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-400 tracking-wider mt-2">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
