"use client";
import { useEffect, useState } from "react";
import {
  acceptFriend,
  declineFriend,
  getFriendStatus,
  removeFriend,
  requestFriend,
  type FriendStatus,
} from "@/app/actions/friends";

interface Props {
  hunterId: string;
}

export default function FriendActions({ hunterId }: Props) {
  const [status, setStatus] = useState<FriendStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFriendStatus(hunterId)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus("none");
      });
    return () => {
      cancelled = true;
    };
  }, [hunterId]);

  async function run<T>(fn: () => Promise<T>, next: FriendStatus) {
    setBusy(true);
    try {
      await fn();
      setStatus(next);
    } catch {
      // leave status as-is
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "self") return null;

  if (status === "friends") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => removeFriend(hunterId), "none")}
        className="px-4 py-2 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs uppercase tracking-[0.3em] rounded hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-colors disabled:opacity-50"
      >
        ✓ Friends
      </button>
    );
  }

  if (status === "pending_out") {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 border border-slate-700 text-slate-500 text-xs uppercase tracking-[0.3em] rounded cursor-not-allowed"
      >
        Request Sent
      </button>
    );
  }

  if (status === "pending_in") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => acceptFriend(hunterId), "friends")}
          className="px-4 py-2 border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 text-xs uppercase tracking-[0.3em] rounded hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => declineFriend(hunterId), "none")}
          className="px-4 py-2 border border-slate-700 text-slate-400 text-xs uppercase tracking-[0.3em] rounded hover:bg-slate-800/60 transition-colors disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => run(() => requestFriend(hunterId), "pending_out")}
      className="px-4 py-2 border border-cyan-400/60 bg-cyan-500/10 text-cyan-200 text-xs uppercase tracking-[0.3em] rounded hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
    >
      + Add Friend
    </button>
  );
}