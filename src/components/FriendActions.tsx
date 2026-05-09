"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  acceptFriend,
  cancelFriendRequest,
  declineFriend,
  getFriendStatus,
  removeFriend,
  requestFriend,
  type FriendStatus,
} from "@/app/actions/friends";

interface Props {
  hunterId: string;
  /**
   * "default" renders the full pill buttons (used when the actions
   * are the only thing in their row). "compact" renders small
   * icon-style buttons that fit inside another header — used in the
   * Hunter ID card top-right slot, mirroring where the kebab sits on
   * the owner's view.
   */
  variant?: "default" | "compact";
}

export default function FriendActions({ hunterId, variant = "default" }: Props) {
  const compact = variant === "compact";
  const t = useTranslations("friends");
  const [status, setStatus] = useState<FriendStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [confirmingUnfriend, setConfirmingUnfriend] = useState(false);
  const [confirmingAdd, setConfirmingAdd] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-revert the unfriend confirm if the user wanders off — five
  // seconds of indecision is a strong "I didn't mean it" signal.
  useEffect(() => {
    if (!confirmingUnfriend) return;
    confirmTimer.current = setTimeout(() => {
      setConfirmingUnfriend(false);
    }, 5000);
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, [confirmingUnfriend]);

  // Same auto-revert for the add-friend confirm. Single-tap on "+ Add
  // Friend" used to fire the request immediately — too easy to hit by
  // accident on a hunter profile. Now it arms a confirm; the user has
  // to tap again within 5s for the request to actually go out.
  useEffect(() => {
    if (!confirmingAdd) return;
    addTimer.current = setTimeout(() => {
      setConfirmingAdd(false);
    }, 5000);
    return () => {
      if (addTimer.current) clearTimeout(addTimer.current);
    };
  }, [confirmingAdd]);

  async function run<T>(fn: () => Promise<T>, next: FriendStatus) {
    setBusy(true);
    try {
      await fn();
      setStatus(next);
      setConfirmingUnfriend(false);
      setConfirmingAdd(false);
    } catch {
      // leave status as-is
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "self") return null;

  // Compact = a small square icon-style button (or two side by side
  // for pending_in / unfriend confirm). Sized to sit next to the kebab
  // dots in the Hunter ID header. Default = the full pill button block
  // used elsewhere (e.g. older layouts that called this without a
  // variant prop).
  const pillCls = compact
    ? "flex items-center justify-center w-7 h-7 rounded text-[12px] leading-none"
    : "px-4 py-2 text-xs tracking-[0.3em] rounded";
  const pillBase = compact ? "" : "uppercase";

  if (status === "friends") {
    if (confirmingUnfriend) {
      return (
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => removeFriend(hunterId), "none")}
            aria-label={t("unfriend")}
            title={t("unfriend")}
            className={`border border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
          >
            {compact ? <span aria-hidden>✕</span> : t("unfriend")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingUnfriend(false)}
            aria-label={t("cancel")}
            title={t("cancel")}
            className={`border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
          >
            {compact ? <span aria-hidden>↶</span> : t("cancel")}
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirmingUnfriend(true)}
        aria-label={t("isFriend")}
        title={t("isFriend")}
        className={`border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
      >
        {compact ? <span aria-hidden>✓</span> : t("isFriend")}
      </button>
    );
  }

  if (status === "pending_out") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => cancelFriendRequest(hunterId), "none")}
        aria-label={t("cancelRequest")}
        title={t("cancelRequest")}
        className={`border border-amber-400/40 bg-amber-500/10 text-amber-300/90 hover:bg-amber-500/20 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
      >
        {compact ? <span aria-hidden>⋯</span> : t("cancelRequest")}
      </button>
    );
  }

  if (status === "pending_in") {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => acceptFriend(hunterId), "friends")}
          aria-label={t("accept")}
          title={t("accept")}
          className={`border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
        >
          {compact ? <span aria-hidden>✓</span> : t("accept")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => declineFriend(hunterId), "none")}
          aria-label={t("decline")}
          title={t("decline")}
          className={`border border-slate-700 text-slate-400 hover:bg-slate-800/60 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
        >
          {compact ? <span aria-hidden>✕</span> : t("decline")}
        </button>
      </div>
    );
  }

  if (confirmingAdd) {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => requestFriend(hunterId), "pending_out")}
          aria-label={t("confirmAdd")}
          title={t("confirmAdd")}
          className={`border border-cyan-400/70 bg-cyan-500/25 text-cyan-100 hover:bg-cyan-500/35 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
        >
          {compact ? <span aria-hidden>✓</span> : t("confirmAdd")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmingAdd(false)}
          aria-label={t("cancel")}
          title={t("cancel")}
          className={`border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
        >
          {compact ? <span aria-hidden>↶</span> : t("cancel")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => setConfirmingAdd(true)}
      aria-label={t("addFriend")}
      title={t("addFriend")}
      className={`border border-cyan-400/60 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 ${pillCls} ${pillBase}`}
    >
      {compact ? <span aria-hidden>＋</span> : t("addFriend")}
    </button>
  );
}
