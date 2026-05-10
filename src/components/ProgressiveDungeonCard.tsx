"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { getDungeon, getDungeonAccent, TIER_BONUS_XP } from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
import {
  notifyStatsUpdated,
  notifyReward,
  notifyCelebration,
  notifySystemMessage,
  beginMutation,
  endMutation,
  XP_PER_EXPOSURE,
} from "@/lib/player";
import { injectPendingJournalEntry } from "@/lib/journalCacheOps";
import {
  enterDungeon,
  logRungExposure,
  undoRungExposure,
} from "@/app/actions/dungeons";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { drainQueue } from "@/lib/offlineDrain";
import {
  addRunToCache,
  adjustRungCountInCache,
  endRunInCache,
} from "@/lib/dashboardCacheOps";
import {
  useEndRunAction,
  useJournalAction,
} from "@/lib/dungeonActions";
import NoteModal from "@/components/NoteModal";

interface ProgressiveDungeonCardProps {
  dungeonId: string;
  initialActive: boolean;
  initialRungCounts: Record<string, number>;
  onRelapse?: () => void;
  onComplete?: () => void;
}

export default function ProgressiveDungeonCard({
  dungeonId,
  initialActive,
  initialRungCounts,
  onRelapse,
  onComplete,
}: ProgressiveDungeonCardProps) {
  const tDungeons = useTranslations("dungeons");
  const tRun = useTranslations("dungeonRun");
  const tRungs = useTranslations("rungs");
  const rungName = (id: string, fallback: string): string => {
    try {
      return tRungs(`${id}.name`);
    } catch {
      return fallback;
    }
  };
  const rungDescription = (id: string, fallback: string): string => {
    try {
      return tRungs(`${id}.description`);
    } catch {
      return fallback;
    }
  };
  const dungeon = getDungeon(dungeonId);
  const dungeonName = dungeon
    ? tDungeons(`${dungeonKey(dungeonId)}.name`)
    : dungeonId;
  const RUNGS = dungeon?.progressive?.rungs ?? [];
  const accent = getDungeonAccent(dungeonId);

  const [active, setActive] = useState<boolean>(initialActive);
  const [counts, setCounts] =
    useState<Record<string, number>>(initialRungCounts);
  const [busy, setBusy] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);

  const currentRungIndex = RUNGS.findIndex(
    (r) => (counts[r.id] ?? 0) < r.target
  );
  const dungeonCleared = currentRungIndex === -1 && RUNGS.length > 0;
  const currentRung = currentRungIndex >= 0 ? RUNGS[currentRungIndex] : null;

  const journal = useJournalAction({ dungeonId, dungeonName });
  const relapse = useEndRunAction({
    dungeonId,
    dungeonName,
    reason: "relapse",
    ruleType: "progressive",
    trackProperties: { current_rung: currentRung?.id ?? null },
    modalOverrides: {
      title: tRun("abandonModalTitle", { dungeon: dungeonName }),
      placeholder: tRun("abandonPlaceholder"),
      confirmLabel: tRun("abandonConfirm"),
    },
    onLocalReset: () => {
      setActive(false);
      setCounts({});
      endRunInCache(dungeonId);
      onRelapse?.();
    },
  });
  // "Retire Ladder" — explicit completion claim from the mastered state.
  // Replaces the old auto-complete: by waiting for an explicit tap, the
  // mastered card stays on the dashboard long enough for the player to
  // hit Undo if the final-rung log was an accident.
  const victory = useEndRunAction({
    dungeonId,
    dungeonName,
    reason: "completed",
    ruleType: "progressive",
    onLocalReset: () => {
      setActive(false);
      endRunInCache(dungeonId);
      onComplete?.();
    },
  });

  async function handleEnsureActive() {
    if (!active) {
      await enterDungeon(dungeonId);
      setActive(true);
    }
  }

  async function handleLog(note: string | null, isPublic?: boolean) {
    setLogModalOpen(false);
    if (!currentRung || busy) return;
    setBusy(true);

    const rungId = currentRung.id;
    const prevCount = counts[rungId] ?? 0;
    const wasInactive = !active;

    const nextCounts = { ...counts, [rungId]: prevCount + 1 };
    setCounts(nextCounts);
    adjustRungCountInCache(dungeonId, rungId, 1);
    if (wasInactive) {
      setActive(true);
      addRunToCache(dungeonId, null);
    }
    notifyStatsUpdated({ xpDelta: XP_PER_EXPOSURE });
    notifyReward({ xp: XP_PER_EXPOSURE });

    // Tier crossing: rung cleared for the first time this run.
    // No localStorage gate — counts reset to 0 on relapse, so re-clearing
    // a rung after a fresh climb correctly fires again.
    const justClearedRung =
      prevCount < currentRung.target && prevCount + 1 >= currentRung.target;
    if (justClearedRung) {
      const tierIdx = currentRungIndex;
      const bonus = TIER_BONUS_XP[tierIdx] ?? 0;
      setTimeout(() => {
        notifyReward({
          xp: bonus,
          sourceKey: "dungeonRun.tierBonusSource",
          sourceValues: { rank: currentRung.rank, dungeonId },
        });
        notifyStatsUpdated({ xpDelta: bonus });
        notifyCelebration({
          titleKey: "celebration.tierCrossingTitle",
          titleValues: { rank: currentRung.rank },
          subtitleKey: "celebration.tierCrossingSubtitle",
          subtitleValues: { dungeon: dungeonName },
          xp: bonus,
          tone: "violet",
        });
      }, 1100);
    }

    // Note: we no longer auto-complete the run when allCleared. The
    // mastered card stays on the dashboard until the player taps Retire
    // (handleRetire below), so an accidental final-rung log can still
    // be walked back with Undo.

    // If the player attached a note to this exposure log, treat it
    // like a journal entry: inject it into the journal cache and
    // surface the [Reflection Recorded] notice. Without this the
    // note vanishes from the UI when offline (Troy's bug 2026-05-08
    // — "did a journal logging in exposure therapy offline, didn't
    // show toast, didn't appear in journal entry").
    if (note) {
      injectPendingJournalEntry({
        dungeonId,
        type: "exposure",
        note,
        isPublic: isPublic ?? false,
      });
      notifySystemMessage({
        headline: "Reflection Recorded",
        body: `Logged to ${dungeonName}. The System remembers.`,
        link: { href: "/journal", label: "Open Journal" },
      });
    }

    beginMutation();
    try {
      await handleEnsureActive();
      const { count } = await logRungExposure(
        dungeonId,
        rungId,
        note ?? undefined,
        isPublic ?? false
      );
      setCounts((prev) => ({ ...prev, [rungId]: count }));
    } catch {
      if (wasInactive) {
        enqueueMutation({
          id: newMutationId(),
          type: "dungeon:enter",
          dungeonId,
        });
      }
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:logExposure",
        dungeonId,
        rungId,
        ...(note ? { note, isPublic: isPublic ?? false } : {}),
      });
      drainQueue().catch(() => {});
    } finally {
      endMutation();
      // Triggers Profile journal section + Navbar XP to refetch — same
      // signal the rest of the app uses for "stats may have changed".
      // Without it, the optimistic cache write isn't picked up until
      // the next focus/tab event.
      notifyStatsUpdated();
      setBusy(false);
    }
  }

  // Find the rung the undo button should target. Prefers the current
  // rung, but falls back to the most-recent populated rung walking
  // backwards. Without this, after over-logging Presence (6/5) the
  // pointer moves to Acknowledge (0/7) and the undo button vanishes,
  // stranding the user with no way to walk back the accidental log.
  const undoableRungIndex = (() => {
    if (currentRung && (counts[currentRung.id] ?? 0) > 0) {
      return currentRungIndex;
    }
    const startIdx =
      currentRungIndex >= 0 ? currentRungIndex - 1 : RUNGS.length - 1;
    for (let i = startIdx; i >= 0; i--) {
      if ((counts[RUNGS[i].id] ?? 0) > 0) return i;
    }
    return -1;
  })();
  const undoableRung =
    undoableRungIndex >= 0 ? RUNGS[undoableRungIndex] : null;

  async function handleUndo() {
    if (!undoableRung || busy) return;

    const rungId = undoableRung.id;
    const prevCount = counts[rungId] ?? 0;
    if (prevCount === 0) return;

    setBusy(true);
    setCounts((prev) => ({ ...prev, [rungId]: prevCount - 1 }));
    adjustRungCountInCache(dungeonId, rungId, -1);
    notifyStatsUpdated({ xpDelta: -XP_PER_EXPOSURE });

    // If we're undoing on a rung that was already cleared, the dungeon
    // may have been marked complete — flip the local active flag back
    // on so the card returns to its in-progress treatment.
    if (dungeonCleared) {
      setActive(true);
    }

    // Refund the rung-clear bonus if the undo drops us back below the
    // rung target. Symmetric with the credit branch in handleExposure;
    // without it, log-to-target then undo lets the player keep the
    // tier bonus indefinitely.
    if (
      prevCount >= undoableRung.target &&
      prevCount - 1 < undoableRung.target
    ) {
      const bonus = TIER_BONUS_XP[undoableRungIndex] ?? 0;
      if (bonus > 0) notifyStatsUpdated({ xpDelta: -bonus });
    }

    beginMutation();
    try {
      await undoRungExposure(dungeonId, rungId);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:undoExposure",
        dungeonId,
        rungId,
      });
      drainQueue().catch(() => {});
    } finally {
      endMutation();
      setBusy(false);
    }
  }

  const currentCount = currentRung ? counts[currentRung.id] ?? 0 : 0;
  const currentPercent = currentRung
    ? Math.min(100, Math.round((currentCount / currentRung.target) * 100))
    : 100;

  return (
    <div className={`bg-slate-900/80 border rounded-xl p-5 text-center ${accent.border} ${accent.glow}`}>
      <p className="text-xs uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
        {dungeon?.icon && (
          <span className={`text-base leading-none ${accent.iconText}`} aria-hidden>
            {dungeon.icon}
          </span>
        )}
        <span className={accent.nameText}>{dungeonName}</span>
      </p>

      {dungeonCleared ? (
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-amber-300 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse">
              {tRun("ladderMastered")}
            </p>
            <p className="text-xs text-slate-500">
              {tRun("ladderRetired", { count: RUNGS.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={victory.open}
              className="flex-1 px-4 py-3 bg-amber-500/20 border border-amber-400/60 rounded text-amber-200 text-sm uppercase tracking-widest hover:bg-amber-500/30 transition-colors drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
            >
              {tRun("claimVictory")}
            </button>
            {undoableRung && (
              <button
                onClick={handleUndo}
                disabled={busy}
                title={`Undo last ${rungName(undoableRung.id, undoableRung.name)}`}
                className="px-3 py-3 bg-slate-800/60 border border-slate-700 rounded text-slate-300 text-xs uppercase tracking-wider hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              >
                {tRun("undo")}
              </button>
            )}
          </div>
        </div>
      ) : currentRung ? (
        <div className="space-y-4">
          <div className="py-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
              {tRun("rungLabel", {
                rank: currentRung.rank,
                current: currentRungIndex + 1,
                total: RUNGS.length,
              })}
            </p>
            <p className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] mt-1 uppercase tracking-wider">
              {rungName(currentRung.id, currentRung.name)}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mt-2 px-2">
              {rungDescription(currentRung.id, currentRung.description)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
              <span>{tRun("progress")}</span>
              <span className="text-cyan-300 font-bold">
                {tRun("progressFraction", {
                  count: currentCount,
                  target: currentRung.target,
                })}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                style={{ width: `${currentPercent}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setLogModalOpen(true)}
              disabled={busy}
              className="flex-1 px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-300 text-sm uppercase tracking-widest hover:bg-cyan-500/30 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] disabled:opacity-50"
            >
              {tRun("logExposure")}
            </button>
            {undoableRung && (
              <button
                onClick={handleUndo}
                disabled={busy}
                title={`Undo last ${rungName(undoableRung.id, undoableRung.name)}`}
                className="px-3 py-3 bg-slate-800/60 border border-slate-700 rounded text-slate-300 text-xs uppercase tracking-wider hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              >
                {tRun("undo")}
              </button>
            )}
          </div>

          <div className="border border-slate-700 rounded-lg p-3 space-y-2 text-left">
            <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 mb-1">
              {tRun("ladder")}
            </p>
            <ul className="space-y-1.5">
              {RUNGS.map((r, i) => {
                const c = counts[r.id] ?? 0;
                const cleared = c >= r.target;
                const isCurrent = i === currentRungIndex;
                const locked = i > currentRungIndex;
                return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-3 text-xs ${
                      cleared
                        ? "text-amber-300"
                        : isCurrent
                        ? "text-cyan-300"
                        : "text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded border text-[10px] font-bold flex-shrink-0 ${
                        cleared
                          ? "bg-amber-500/20 border-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                          : isCurrent
                          ? "bg-cyan-500/10 border-cyan-400/60 animate-pulse"
                          : "bg-slate-800/50 border-slate-700"
                      }`}
                    >
                      {r.rank}
                    </span>
                    <span className="uppercase tracking-wider flex-1">
                      {locked ? tRun("lockedRung") : rungName(r.id, r.name)}
                    </span>
                    <span className="text-[10px] font-mono">
                      {locked ? "—" : `${c}/${r.target}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {active && (
            <div className="flex flex-col gap-2 items-stretch">
              <button
                onClick={journal.open}
                className="px-4 py-2 border border-slate-700 rounded text-slate-300 text-[11px] uppercase tracking-[0.3em] hover:text-cyan-200 hover:border-cyan-500/40 transition-colors"
              >
                {tRun("journalEntry")}
              </button>
              <button
                onClick={relapse.open}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400/70 text-xs uppercase tracking-wider hover:bg-red-500/20 transition-colors"
              >
                {tRun("abandonLadder")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-600 py-4">{tRun("noRungs")}</p>
      )}

      <NoteModal
        open={logModalOpen}
        title={tRun("logExposureTitle", {
          rung: currentRung ? rungName(currentRung.id, currentRung.name) : "",
        })}
        placeholder={tRun("logExposurePlaceholder")}
        confirmLabel={tRun("logExposureConfirm")}
        skipLabel={tRun("logExposureSkip")}
        showPublicToggle
        onSubmit={handleLog}
        onCancel={() => setLogModalOpen(false)}
      />
      <NoteModal {...relapse.modalProps} />
      <NoteModal {...victory.modalProps} />
      <NoteModal {...journal.modalProps} />
    </div>
  );
}