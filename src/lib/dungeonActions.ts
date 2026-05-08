"use client";
import { useState } from "react";
import {
  endRun,
  logJournalEntry,
  setRunStartDate,
} from "@/app/actions/dungeons";
import { drainQueue } from "@/lib/offlineDrain";
import { enqueueMutation, newMutationId } from "@/lib/offlineQueue";
import { track } from "@/lib/analytics";
import {
  notifyReward,
  notifyStatsUpdated,
  notifySystemMessage,
  XP_PER_COMPLETION,
} from "@/lib/player";
import { injectPendingJournalEntry } from "@/lib/journalCacheOps";

/**
 * setStartDate with offline fallback. Card decides what to do with
 * its own optimistic UI; this helper just commits the server write.
 */
export async function commitSetStartDate(
  dungeonId: string,
  dateIso: string
): Promise<void> {
  try {
    await setRunStartDate(dungeonId, dateIso);
  } catch {
    enqueueMutation({
      id: newMutationId(),
      type: "dungeon:setStartDate",
      dungeonId,
      dateIso,
    });
    drainQueue().catch(() => {});
  }
}

interface JournalActionOptions {
  dungeonId: string;
  dungeonName: string;
}

interface NoteModalProps {
  open: boolean;
  title: string;
  placeholder: string;
  confirmLabel: string;
  skipLabel: string;
  tone: "neutral" | "danger";
  cancelOnSkip: boolean;
  showPublicToggle: boolean;
  onSubmit: (note: string | null, isPublic?: boolean) => void;
  onCancel: () => void;
}

/**
 * Per-dungeon "+ Journal Entry" flow. Owns its own modal state and the
 * try-server-then-enqueue dance. The card just renders a button that
 * calls `open()` and a NoteModal spread with `modalProps`.
 */
export function useJournalAction({
  dungeonId,
  dungeonName,
}: JournalActionOptions): {
  open: () => void;
  modalProps: NoteModalProps;
} {
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(note: string | null, isPublic?: boolean) {
    setIsOpen(false);
    if (!note) return;

    // Optimistic inject so the entry appears in the journal section
    // immediately, regardless of online state. Server refetch
    // overwrites with authoritative data when it lands.
    injectPendingJournalEntry({
      dungeonId,
      type: "journal",
      note,
      isPublic: isPublic ?? false,
    });

    try {
      await logJournalEntry(dungeonId, note, isPublic ?? false);
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:journalLog",
        dungeonId,
        note,
        isPublic: isPublic ?? false,
      });
      drainQueue().catch(() => {});
    }
    // Confirm the save with a [System]-flavored notice + jumping-off
    // point to the archive. Fires whether the save went to the server
    // directly or got queued for offline drain — the entry exists
    // locally either way.
    notifySystemMessage({
      headline: "Reflection Recorded",
      body: `Logged to ${dungeonName}. The System remembers.`,
      link: { href: "/journal", label: "Open Journal" },
    });
    // Drives the Profile page's journal section to refetch (or
    // re-read its cache, which we just updated). Without this, the
    // entry doesn't appear until manual refresh — same root cause as
    // Troy's "is it saved at all?" anxiety.
    notifyStatsUpdated();
  }

  return {
    open: () => setIsOpen(true),
    modalProps: {
      open: isOpen,
      title: `Journal — ${dungeonName}`,
      placeholder: "What's on your mind today?",
      confirmLabel: "Save Entry",
      skipLabel: "Cancel",
      tone: "neutral",
      cancelOnSkip: true,
      showPublicToggle: true,
      onSubmit: handleSubmit,
      onCancel: () => setIsOpen(false),
    },
  };
}

interface EndRunActionOptions {
  dungeonId: string;
  dungeonName: string;
  reason: "relapse" | "completed" | "exited";
  /** For analytics — passed through to the relapse track event. */
  ruleType?: string;
  trackProperties?: Record<string, unknown>;
  /** Synchronous optimistic UI reset run before the server call. */
  onLocalReset: () => void;
  /** Override default modal copy (e.g. ProgressiveCard's "Abandon Ladder"). */
  modalOverrides?: {
    title?: string;
    placeholder?: string;
    confirmLabel?: string;
    skipLabel?: string;
    /** When true, the skip button cancels the action instead of submitting. */
    cancelOnSkip?: boolean;
  };
}

/**
 * Owns the relapse / claim-victory / exit modal flow. Only `completed`
 * (true victory after reaching the dungeon's target) banks the
 * +XP_PER_COMPLETION bonus — `exited` is a graceful walk-away, no
 * bonus, while `relapse` is the failure path. Cards pass their own
 * optimistic-UI-reset callback.
 */
export function useEndRunAction(opts: EndRunActionOptions): {
  open: () => void;
  modalProps: NoteModalProps;
} {
  const [isOpen, setIsOpen] = useState(false);
  const isRelapse = opts.reason === "relapse";
  const isVictory = opts.reason === "completed";

  async function handleSubmit(note: string | null, isPublic?: boolean) {
    setIsOpen(false);
    if (isRelapse && opts.ruleType) {
      track("relapse", {
        dungeon_id: opts.dungeonId,
        rule_type: opts.ruleType,
        ...(opts.trackProperties ?? {}),
      });
    }
    if (isVictory) {
      notifyReward({
        xp: XP_PER_COMPLETION,
        sourceKey: "gainSources.victory",
        sourceValues: { dungeonId: opts.dungeonId },
      });
    }
    opts.onLocalReset();
    notifyStatsUpdated();

    try {
      await endRun(
        opts.dungeonId,
        opts.reason,
        note ?? undefined,
        isPublic ?? false
      );
    } catch {
      enqueueMutation({
        id: newMutationId(),
        type: "dungeon:endRun",
        dungeonId: opts.dungeonId,
        reason: opts.reason,
        ...(note ? { note, isPublic: isPublic ?? false } : {}),
      });
      drainQueue().catch(() => {});
    }
  }

  const defaultTitle = isRelapse
    ? `Relapse — ${opts.dungeonName}`
    : isVictory
    ? `Victory — ${opts.dungeonName}`
    : `Exit — ${opts.dungeonName}`;
  const defaultPlaceholder = isRelapse
    ? "What triggered it? How are you feeling? (optional)"
    : isVictory
    ? "How did this run change you? (optional)"
    : "Why are you exiting? (optional)";
  const defaultConfirm = isRelapse
    ? "Confirm Relapse"
    : isVictory
    ? "Claim Victory"
    : "Exit Dungeon";

  return {
    open: () => setIsOpen(true),
    modalProps: {
      open: isOpen,
      title: opts.modalOverrides?.title ?? defaultTitle,
      placeholder: opts.modalOverrides?.placeholder ?? defaultPlaceholder,
      confirmLabel: opts.modalOverrides?.confirmLabel ?? defaultConfirm,
      skipLabel:
        opts.modalOverrides?.skipLabel ??
        (isVictory ? "Skip Note" : "Cancel"),
      tone: isRelapse ? "danger" : "neutral",
      cancelOnSkip: opts.modalOverrides?.cancelOnSkip ?? !isVictory,
      showPublicToggle: true,
      onSubmit: handleSubmit,
      onCancel: () => setIsOpen(false),
    },
  };
}