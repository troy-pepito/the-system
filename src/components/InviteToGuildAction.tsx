"use client";

import { useEffect, useState } from "react";
import {
  getInviteEligibility,
  inviteHunterToGuild,
  type InviteEligibility,
} from "@/app/actions/guilds";

interface Props {
  hunterId: string;
  /** Compact mode mirrors FriendActions: a small square pill that
   *  sits cleanly next to other actions in the Hunter ID header row. */
  variant?: "default" | "compact";
}

/**
 * Invite button + status pill on the public hunter card. Eligibility
 * is checked once on mount via getInviteEligibility so we don't show
 * a button that would error on click.
 *
 * Renders four states:
 * - hidden (non-owners, viewer looking at themselves)
 * - "In Guild" pill (target is already in any guild)
 * - "Invited" pill (viewer already sent an invite)
 * - "Invite" action button (clear to send)
 *
 * Pill styling matches FriendActions so both surfaces read as a
 * coherent set when shown side-by-side.
 */
export default function InviteToGuildAction({
  hunterId,
  variant = "default",
}: Props) {
  const compact = variant === "compact";
  const [eligibility, setEligibility] = useState<
    InviteEligibility | "loading"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInviteEligibility(hunterId)
      .then((e) => {
        if (!cancelled) setEligibility(e);
      })
      .catch(() => {
        if (!cancelled) setEligibility("ineligible");
      });
    return () => {
      cancelled = true;
    };
  }, [hunterId]);

  async function handleInvite() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await inviteHunterToGuild(hunterId);
      setEligibility("invited");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send invite");
    } finally {
      setBusy(false);
    }
  }

  if (eligibility === "loading" || eligibility === "ineligible") return null;

  // Same pill shape FriendActions uses, so the two indicators sit
  // cleanly side-by-side in the Hunter ID header row.
  const pillCls = compact
    ? "flex items-center justify-center w-7 h-7 rounded text-[12px] leading-none"
    : "px-4 py-2 text-xs tracking-[0.3em] rounded";
  const pillBase = compact ? "" : "uppercase";

  if (eligibility === "in-guild") {
    return (
      <span
        title="Already in a guild"
        className={`inline-flex border border-slate-600 bg-slate-800/40 text-slate-300 ${pillCls} ${pillBase}`}
      >
        {compact ? <span aria-hidden>🛡</span> : "In Guild"}
      </span>
    );
  }

  if (eligibility === "invited") {
    return (
      <span
        title="Invited to your guild"
        className={`inline-flex border border-amber-400/50 bg-amber-500/15 text-amber-200 ${pillCls} ${pillBase}`}
      >
        {compact ? <span aria-hidden>📜</span> : "Invited"}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleInvite}
        disabled={busy}
        title="Invite to your guild"
        aria-label="Invite to guild"
        className={`border border-cyan-400/60 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/40 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
      >
        {compact ? (
          <span aria-hidden>+</span>
        ) : busy ? (
          "Sending..."
        ) : (
          "Invite"
        )}
      </button>
      {error && (
        <span className="text-[9px] text-red-400 tracking-wider">{error}</span>
      )}
    </div>
  );
}
