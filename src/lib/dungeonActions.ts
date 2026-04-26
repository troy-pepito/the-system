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
  XP_PER_COMPLETION,
} from "@/lib/player";

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
  reason: "relapse" | "completed";
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
  };
}

/**
 * Owns the relapse / claim-victory modal flow. Cards pass their own
 * optimistic-UI-reset callback. Hook handles modal state, analytics,
 * notify events, server call, offline enqueue.
 */
export function useEndRunAction(opts: EndRunActionOptions): {
  open: () => void;
  modalProps: NoteModalProps;
} {
  const [isOpen, setIsOpen] = useState(false);
  const isRelapse = opts.reason === "relapse";

  async function handleSubmit(note: string | null, isPublic?: boolean) {
    setIsOpen(false);
    if (isRelapse && opts.ruleType) {
      track("relapse", {
        dungeon_id: opts.dungeonId,
        rule_type: opts.ruleType,
        ...(opts.trackProperties ?? {}),
      });
    }
    if (!isRelapse) {
      notifyReward({ xp: XP_PER_COMPLETION });
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
    : `Victory — ${opts.dungeonName}`;
  const defaultPlaceholder = isRelapse
    ? "What triggered it? How are you feeling? (optional)"
    : "How did this run change you? (optional)";
  const defaultConfirm = isRelapse ? "Confirm Relapse" : "Claim Victory";

  return {
    open: () => setIsOpen(true),
    modalProps: {
      open: isOpen,
      title: opts.modalOverrides?.title ?? defaultTitle,
      placeholder: opts.modalOverrides?.placeholder ?? defaultPlaceholder,
      confirmLabel: opts.modalOverrides?.confirmLabel ?? defaultConfirm,
      skipLabel: isRelapse ? "Cancel" : "Skip Note",
      tone: isRelapse ? "danger" : "neutral",
      cancelOnSkip: isRelapse,
      showPublicToggle: true,
      onSubmit: handleSubmit,
      onCancel: () => setIsOpen(false),
    },
  };
}