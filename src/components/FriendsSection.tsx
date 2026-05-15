"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  acceptFriend,
  declineFriend,
  getFriends,
  getPendingRequests,
  type FriendCard,
  type PendingRequest,
} from "@/app/actions/friends";
import { getRankStyle } from "@/lib/rankStyle";

export default function FriendsSection() {
  const t = useTranslations("friends");
  const [friends, setFriends] = useState<FriendCard[] | null>(null);
  const [pending, setPending] = useState<PendingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const [f, p] = await Promise.all([
      getFriends().catch(() => []),
      getPendingRequests().catch(() => []),
    ]);
    setFriends(f);
    setPending(p);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleAccept(requesterId: string) {
    setBusyId(requesterId);
    try {
      await acceptFriend(requesterId);
      await reload();
    } catch {} finally {
      setBusyId(null);
    }
  }

  async function handleDecline(requesterId: string) {
    setBusyId(requesterId);
    try {
      await declineFriend(requesterId);
      await reload();
    } catch {} finally {
      setBusyId(null);
    }
  }

  if (friends === null && pending === null) return null;

  const hasPending = (pending?.length ?? 0) > 0;
  const hasFriends = (friends?.length ?? 0) > 0;
  if (!hasPending && !hasFriends) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-2">
          {t("title")}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t("emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasPending && (
        <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-amber-400/80 mb-4">
            {t("requests", { count: pending!.length })}
          </p>
          <ul className="space-y-3">
            {pending!.map((req) => (
              <li
                key={req.requesterId}
                className="flex items-center gap-3 border border-slate-800 rounded-lg p-3"
              >
                <div className="shrink-0 w-10 h-10 overflow-hidden border border-cyan-400/40 bg-slate-900">
                  {req.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={req.imageUrl}
                      alt={req.hunterName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-sm font-bold">
                      ?
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cyan-200 uppercase tracking-wider truncate">
                    {req.hunterName}
                  </p>
                  <p className="text-[9px] text-slate-500 tracking-widest uppercase">
                    {t("wantsToConnect")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(req.requesterId)}
                    disabled={busyId === req.requesterId}
                    className="px-3 py-1.5 border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 text-[10px] uppercase tracking-[0.25em] rounded hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                  >
                    {t("accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(req.requesterId)}
                    disabled={busyId === req.requesterId}
                    className="px-3 py-1.5 border border-slate-700 text-slate-300 text-[10px] uppercase tracking-[0.25em] rounded hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                  >
                    {t("decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasFriends && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70">
              {t("title")}
            </p>
            <p className="text-[10px] text-slate-500 tracking-wider">
              {friends!.length}
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends!.map((f) => (
              <li key={f.hunterId}>
                <Link
                  href={`/h/${f.hunterId}`}
                  className="flex items-center gap-3 border border-slate-800 rounded-lg p-3 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-colors"
                >
                  <div className="shrink-0 w-10 h-10 overflow-hidden border border-cyan-400/40 bg-slate-900">
                    {f.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.imageUrl}
                        alt={f.hunterName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-sm font-bold">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-cyan-200 uppercase tracking-wider truncate">
                      {f.hunterName}
                    </p>
                    <p className="text-[10px] text-slate-500 tracking-widest uppercase">
                      <span>{t("rankPrefix")}</span>
                      <span
                        className={`font-bold ${getRankStyle(f.rank).text} ${
                          getRankStyle(f.rank).textClass
                        } ${getRankStyle(f.rank).glow}`}
                      >
                        {f.rank}
                      </span>
                      <span className="text-slate-700"> · </span>
                      <span className="text-emerald-400">
                        {t("levelLabel", { level: f.level })}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}