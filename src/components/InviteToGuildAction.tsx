"use client";

import { useEffect, useState } from "react";
import {
  getInviteEligibility,
  inviteHunterToGuild,
  type InviteEligibility,
} from "@/app/actions/guilds";

interface Props {
  hunterId: string;
}

/**
 * Owner-only invite button on the public hunter card. Renders nothing
 * for non-owners or when the target isn't invitable (already in a
 * guild, is the viewer themselves, etc) — eligibility is checked once
 * on mount via getInviteEligibility so we don't show a button that
 * would just error on click.
 *
 * On success, locally flips to "Invited" so the viewer sees immediate
 * feedback without a refetch.
 */
export default function InviteToGuildAction({ hunterId }: Props) {
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

  if (eligibility === "in-guild") {
    return (
      <span className="text-[10px] tracking-[0.3em] uppercase text-slate-500">
        Already in a guild
      </span>
    );
  }

  if (eligibility === "invited") {
    return (
      <span className="text-[10px] tracking-[0.3em] uppercase text-amber-300/80">
        Invited
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleInvite}
        disabled={busy}
        className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/60 text-cyan-100 text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500/40 transition-colors disabled:opacity-50"
      >
        {busy ? "Sending..." : "Invite to Guild"}
      </button>
      {error && (
        <span className="text-[9px] text-red-400 tracking-wider">
          {error}
        </span>
      )}
    </div>
  );
}
