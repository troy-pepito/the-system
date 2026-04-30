"use client";

import { useUser } from "@clerk/nextjs";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getLevelFromXp, getRank } from "@/lib/player";
import { useTweenNumber } from "@/lib/useTweenNumber";
import {
  enqueueMutation,
  newMutationId,
  removeMutations,
  getQueue,
  usePendingHunterName,
} from "@/lib/offlineQueue";
import {
  clearPendingAvatar,
  savePendingAvatar,
  usePendingAvatarUrl,
} from "@/lib/pendingAvatar";
import {
  HUNTER_TYPE_DEFS,
  isHunterType,
  type HunterType,
} from "@/lib/hunterType";

const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
const LEVELS_PER_RANK = 10;

interface HunterCardProps {
  totalXp: number;
  scattered?: boolean;
}

export default function HunterCard({ totalXp, scattered }: HunterCardProps) {
  const tweenedXp = useTweenNumber(totalXp, 700);
  const { level, currentXp, xpToNext } = getLevelFromXp(
    Math.round(tweenedXp)
  );
  const { user, isLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const rank = getRank(level);
  const rankIdx = RANKS.indexOf(rank as (typeof RANKS)[number]);
  const isMaxRank = rankIdx >= RANKS.length - 1;
  const levelIntoRank = (level - 1) % LEVELS_PER_RANK;
  const levelsToNext = LEVELS_PER_RANK - levelIntoRank;
  const nextRank = isMaxRank ? null : RANKS[rankIdx + 1];

  const levelProgress = xpToNext > 0 ? currentXp / xpToNext : 0;
  const fractionalLevelIntoRank = levelIntoRank + levelProgress;
  const segmentFillPct = (i: number): number => {
    if (i < rankIdx) return 100;
    if (i > rankIdx) return 0;
    if (isMaxRank) return 100;
    return (fractionalLevelIntoRank / LEVELS_PER_RANK) * 100;
  };

  const meta = user?.unsafeMetadata as
    | { hunterName?: string; hunterType?: string }
    | undefined;
  const hunterName = meta?.hunterName;
  const hunterType: HunterType | null =
    typeof meta?.hunterType === "string" && isHunterType(meta.hunterType)
      ? meta.hunterType
      : null;
  const hunterTypeDef = hunterType ? HUNTER_TYPE_DEFS[hunterType] : null;
  const pendingName = usePendingHunterName();
  const pendingAvatarUrl = usePendingAvatarUrl();
  const avatarSrc = pendingAvatarUrl || (isLoaded ? user?.imageUrl : null);
  const displayName =
    pendingName ||
    hunterName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Hunter";

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  function startEditName() {
    if (!isLoaded || !user) return;
    setNameDraft(displayName);
    setError(null);
    setEditingName(true);
  }

  function cancelEditName() {
    setEditingName(false);
    setNameDraft("");
  }

  async function commitName() {
    if (!user) return;
    const next = nameDraft.trim();
    if (!next || next === displayName) {
      cancelEditName();
      return;
    }
    setSavingName(true);
    setError(null);

    const existingPending = getQueue().filter(
      (m) => m.type === "clerk:updateHunterName"
    );
    const mutationId = newMutationId();
    enqueueMutation({
      id: mutationId,
      type: "clerk:updateHunterName",
      hunterName: next,
    });
    setEditingName(false);
    setNameDraft("");

    try {
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, hunterName: next },
      });
      removeMutations([mutationId, ...existingPending.map((m) => m.id)]);
    } catch {
      // Stays in queue; OfflineSyncManager retries when online.
    } finally {
      setSavingName(false);
    }
  }

  async function handleShare() {
    if (!user || typeof window === "undefined") return;
    const url = `${window.location.origin}/h/${user.id}`;
    const shareText = `Rank ${rank} · Lv ${level} · Hunter on Shivaliva Leveling. Building real-life discipline through The System.`;

    // Prefer the native share sheet (mobile / desktop browsers that
    // support it). Falls back to clipboard copy if not available
    // (Firefox desktop, older browsers).
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: "Shivaliva Leveling: The System",
          text: shareText,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {}
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError(null);
    setUploading(true);

    try {
      await savePendingAvatar(file);
    } catch {
      setError("Could not store avatar locally");
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const existingPending = getQueue().filter(
      (m) => m.type === "clerk:updateAvatar"
    );
    const mutationId = newMutationId();
    enqueueMutation({ id: mutationId, type: "clerk:updateAvatar" });

    try {
      await user.setProfileImage({ file });
      removeMutations([mutationId, ...existingPending.map((m) => m.id)]);
      await clearPendingAvatar();
    } catch {
      // Stays in IDB + queue; OfflineSyncManager retries when online.
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 z-10 pointer-events-none" />

      <div className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.05)] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-[9px] text-cyan-400/70 tracking-[0.4em] uppercase">
            Hunter ID
          </p>
          {user && (
            <div className="flex items-center gap-3 text-[9px] tracking-[0.3em] uppercase shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="text-slate-500 hover:text-cyan-300 transition-colors"
              >
                {shareCopied ? "✓ Copied" : "Share"}
              </button>
              <span className="text-slate-700">·</span>
              <Link
                href={`/h/${user.id}`}
                className="text-slate-500 hover:text-cyan-300 transition-colors"
              >
                View Public
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !isLoaded}
            aria-label="Change profile picture"
            className="group relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 overflow-hidden border border-cyan-400/50 bg-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-3xl font-bold">
                ?
              </div>
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[9px] text-cyan-200 tracking-[0.3em] uppercase font-bold">
                  Change
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                <span className="text-[9px] text-cyan-300 tracking-[0.3em] uppercase animate-pulse">
                  Uploading
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">
                Name
              </p>
              {scattered && (
                <span
                  title="No daily quests completed yesterday. Clears after your next active day."
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-red-500/50 bg-red-500/10 text-[9px] text-red-300 tracking-[0.25em] uppercase rounded-sm"
                >
                  <span aria-hidden>⚠</span>
                  <span>Scattered</span>
                </span>
              )}
            </div>
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitName();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEditName();
                  }
                }}
                maxLength={30}
                disabled={savingName}
                className="w-full bg-transparent border-b border-cyan-400/60 text-lg sm:text-xl font-bold text-cyan-100 tracking-wider focus:outline-none focus:border-cyan-300 disabled:opacity-60"
              />
            ) : (
              <button
                type="button"
                onClick={startEditName}
                title="Rename"
                className="group flex items-center gap-2 w-full text-left"
              >
                <span className="font-display text-lg sm:text-xl font-bold text-cyan-100 truncate tracking-wider group-hover:text-white transition-colors">
                  {displayName}
                </span>
                <span className="text-[9px] text-slate-600 tracking-[0.3em] uppercase opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  Edit
                </span>
              </button>
            )}
            {hunterTypeDef && (
              <Link
                href="/settings"
                title="Change path"
                className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 border rounded-sm text-[9px] tracking-[0.3em] uppercase font-bold ${hunterTypeDef.badgeStyle}`}
              >
                <span>{hunterTypeDef.label}</span>
              </Link>
            )}
            {!hunterTypeDef && isLoaded && user && (
              <Link
                href="/settings"
                className="inline-block mt-2 text-[9px] tracking-[0.3em] uppercase text-slate-500 hover:text-cyan-300 border-b border-slate-700 hover:border-cyan-400/50 transition-colors pb-0.5"
              >
                + Choose your path
              </Link>
            )}
            <div className="flex items-center gap-5 mt-5">
              <div>
                <p className="text-[9px] text-slate-500 tracking-widest uppercase">
                  Rank
                </p>
                <p className="text-2xl font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] leading-none mt-1">
                  {rank}
                </p>
              </div>
              <div className="h-10 w-px bg-slate-700" />
              <div>
                <p className="text-[9px] text-slate-500 tracking-widest uppercase">
                  Level
                </p>
                <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] leading-none mt-1">
                  {level}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider mb-4">
            <span>Rank Path</span>
            <span className="font-mono text-amber-300/80">
              {isMaxRank
                ? "MAX RANK"
                : `${levelsToNext} LVL → ${nextRank}`}
            </span>
          </div>
          <div className="flex items-center">
            {RANKS.map((r, i) => {
              const isPast = i < rankIdx;
              const isCurrent = i === rankIdx;
              return (
                <Fragment key={r}>
                  <div
                    className={`shrink-0 w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-full border transition-colors ${
                      isCurrent
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                        : isPast
                          ? "bg-amber-500/5 border-amber-500/40 text-amber-400/70"
                          : "bg-slate-950 border-slate-800 text-slate-700"
                    }`}
                  >
                    {r}
                  </div>
                  {i < RANKS.length - 1 && (
                    <div className="flex-1 mx-1.5 h-px relative">
                      <div className="absolute inset-0 bg-slate-800" />
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                        style={{ width: `${segmentFillPct(i)}%` }}
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-[10px] text-red-400 tracking-wider mt-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}