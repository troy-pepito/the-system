"use client";

import { useUser } from "@clerk/nextjs";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { getRankStyle } from "@/lib/rankStyle";
import Tooltip from "@/components/Tooltip";

const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
const LEVELS_PER_RANK = 10;

interface HunterCardProps {
  totalXp: number;
  scattered?: boolean;
  /**
   * Dimension totals (body / mind / emotion / energy / spirit). Used
   * to compute the "dominant dimension" badge in the Badges row. Pass
   * undefined to hide the row entirely (e.g. before stats load).
   */
  dimensions?: {
    body: number;
    mind: number;
    emotion: number;
    energy: number;
    spirit: number;
  };
}

const DIMENSION_ORDER: ReadonlyArray<HunterType> = [
  "body",
  "mind",
  "emotion",
  "energy",
  "spirit",
];

/** Returns the highest-scoring dimension, or null if every dimension is 0. */
function dominantDimension(
  dims: HunterCardProps["dimensions"]
): HunterType | null {
  if (!dims) return null;
  let best: HunterType | null = null;
  let bestScore = 0;
  // Iterate in canonical order so ties resolve deterministically (body
  // wins a tie over mind, etc.) — feels less random than alphabetical.
  for (const d of DIMENSION_ORDER) {
    const score = dims[d];
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

export default function HunterCard({
  totalXp,
  scattered,
  dimensions,
}: HunterCardProps) {
  const t = useTranslations("hunterCard");
  const tHunterTypes = useTranslations("hunterTypes");
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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
      setError(t("avatarLocalError"));
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

  const rankFrame = getRankStyle(rank);

  return (
    <div className="relative">
      <div
        className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
      />
      <div
        className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
      />
      <div
        className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
      />
      <div
        className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 z-10 pointer-events-none ${rankFrame.cornerBorder}`}
      />

      <div
        className={`relative bg-slate-950/80 border p-5 sm:p-6 transition-shadow duration-700 ${rankFrame.cardBorder} ${rankFrame.cardGlow}`}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-[9px] text-cyan-400/70 tracking-[0.4em] uppercase">
            {t("id")}
          </p>
          {user && (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex flex-col items-center justify-center w-7 h-7 -m-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-900/60 transition-colors"
              >
                <span className="block w-1 h-1 rounded-full bg-current mb-0.5" />
                <span className="block w-1 h-1 rounded-full bg-current mb-0.5" />
                <span className="block w-1 h-1 rounded-full bg-current" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute top-full right-0 mt-1.5 z-50 min-w-[160px] py-1 bg-slate-900/95 border border-slate-700 rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      startEditName();
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] tracking-[0.3em] uppercase text-slate-300 hover:bg-slate-800 hover:text-cyan-200 transition-colors"
                  >
                    {t("rename")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      handleShare();
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] tracking-[0.3em] uppercase text-slate-300 hover:bg-slate-800 hover:text-cyan-200 transition-colors"
                  >
                    {shareCopied ? t("shareCopied") : t("share")}
                  </button>
                  <Link
                    href={`/h/${user.id}`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[10px] tracking-[0.3em] uppercase text-slate-300 hover:bg-slate-800 hover:text-cyan-200 transition-colors"
                  >
                    {t("viewPublic")}
                  </Link>
                  <Link
                    href="/ranks"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[10px] tracking-[0.3em] uppercase text-slate-300 hover:bg-slate-800 hover:text-cyan-200 transition-colors"
                  >
                    {t("viewAllRanks")}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !isLoaded}
            aria-label={t("changeAvatarLabel")}
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
                  {t("changeAvatar")}
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                <span className="text-[9px] text-cyan-300 tracking-[0.3em] uppercase animate-pulse">
                  {t("uploading")}
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
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase">
                {t("name")}
              </p>
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
              <p className="font-display text-lg sm:text-xl font-bold text-cyan-100 truncate tracking-wider">
                {displayName}
              </p>
            )}
            {hunterTypeDef && (
              <span
                className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 border rounded-sm text-[9px] tracking-[0.3em] uppercase font-bold ${hunterTypeDef.badgeStyle}`}
              >
                <span>{tHunterTypes(`${hunterTypeDef.id}.label`)}</span>
              </span>
            )}
            <div className="flex items-center gap-4 mt-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                  {t("rank")}
                </p>
                <p
                  className={`text-2xl font-bold leading-none mt-1 ${
                    getRankStyle(rank).text
                  } ${getRankStyle(rank).textClass} ${getRankStyle(rank).glow}`}
                >
                  {rank}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                  {t("level")}
                </p>
                <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] leading-none mt-1">
                  {level}
                </p>
              </div>
            </div>

            {/* Badges row — derived/earned status. Currently:
                - Dominant-dimension hunter (Body/Mind/Emotion/Energy/Spirit)
                - Scattered (missed yesterday after prior activity)
                Future slots: Shadow Monarch (premium), Elite Player
                (Foundations 100%), etc. Row is hidden entirely when
                no badges qualify. */}
            {(() => {
              const dominant = dominantDimension(dimensions);
              const def = dominant ? HUNTER_TYPE_DEFS[dominant] : null;
              if (!def && !scattered) return null;
              return (
                <div className="mt-5">
                  <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                    Badges
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {def && dominant && (
                      <span
                        title={`Your strongest dimension is ${def.label.replace(" Hunter", "")}`}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-sm text-[9px] tracking-[0.3em] uppercase font-bold ${def.badgeStyle}`}
                      >
                        <span>{dominant}-Dominant</span>
                      </span>
                    )}
                    {scattered && (
                      <Tooltip content={t("scatteredHelp")}>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-red-500/50 bg-red-500/10 text-[9px] text-red-300 tracking-[0.3em] uppercase rounded-sm font-bold">
                          <span aria-hidden>⚠</span>
                          <span>{t("scattered")}</span>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider mb-4">
            <span>{t("rankPath")}</span>
            <span className="font-mono text-amber-300/80">
              {isMaxRank
                ? t("maxRank")
                : t("rankProgress", { count: levelsToNext, next: nextRank ?? "" })}
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