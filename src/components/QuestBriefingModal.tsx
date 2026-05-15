"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

// Quest Briefing modal that fires when a hunter taps "Enter Dungeon"
// on /portals. The previous flow committed the dungeon-run on a
// single click, which let accidental taps (or impulse picks) drag
// the player into a multi-week commitment without a beat of pause.
// The briefing surfaces the rules + system warning + cadence
// expectations so the entry is deliberate, in the RPG-mission-info
// style.

interface QuestBriefingModalProps {
  open: boolean;
  dungeonName: string;
  dungeonIcon?: string;
  description: string;
  rules: string[];
  dimensions: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function QuestBriefingModal({
  open,
  dungeonName,
  dungeonIcon,
  description,
  rules,
  dimensions,
  onConfirm,
  onCancel,
}: QuestBriefingModalProps) {
  const t = useTranslations("questBriefing");
  // Portal-mount flag. We can only call createPortal after mount (the
  // document object doesn't exist during SSR), and rendering null on
  // the server keeps SSR + first client paint identical, no hydration
  // mismatch. Without the portal the modal lived inside PageTransition,
  // whose animate-fade-in-up transform creates a containing block, so
  // our position:fixed was scoped to the PageTransition div instead of
  // the viewport and the modal landed at the bottom of the page
  // instead of centered.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // One-shot post-mount flag so createPortal can target document.body
    // safely on the client. Same legit-exception pattern as the
    // DailyResetCountdown mount-time set: the alternative (lazy useState
    // initializer) would run during SSR and force a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  // Stable ref to the latest onCancel so the keydown effect doesn't
  // re-subscribe every render. Without this the effect re-ran on
  // every parent render and the body-scroll-lock prevOverflow capture
  // got clobbered.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelRef.current();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  // Defensive: if rules came through as undefined (i18n key missing
  // for a given locale) we still want to render the modal, just
  // without the cadence section. Pre-this-guard a missing key would
  // throw on rules.length and crash the whole modal render.
  const safeRules = Array.isArray(rules) ? rules : [];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-briefing-title"
      className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/90 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Overlay scrolls, not the card. Card has no max-h and no
          internal overflow, so it never gets an inner scrollbar
          clipping the window. min-h-full + flex center vertically
          for short content; tall content pushes the overlay scroll
          naturally. */}
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-slate-900/95 border border-cyan-400/40 rounded-xl p-6 shadow-[0_0_40px_rgba(34,211,238,0.3),inset_0_0_24px_rgba(34,211,238,0.05)] animate-fade-in"
        >
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

        <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 text-center mb-4">
          {t("header")}
        </p>

        <h2
          id="quest-briefing-title"
          className="font-display text-2xl font-bold uppercase tracking-wider text-cyan-200 text-center flex items-center justify-center gap-3 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]"
        >
          {dungeonIcon && (
            <span aria-hidden className="text-xl leading-none">
              {dungeonIcon}
            </span>
          )}
          <span>{dungeonName}</span>
        </h2>

        {dimensions.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
            {dimensions.map((dim) => (
              <span
                key={dim}
                className="text-[9px] font-bold uppercase tracking-[0.25em] px-1.5 py-0.5 border border-cyan-500/40 rounded-sm text-cyan-300/80"
              >
                {dim}
              </span>
            ))}
          </div>
        )}

        <section className="mt-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 mb-2">
            {t("objectiveLabel")}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {description}
          </p>
        </section>

        {safeRules.length > 0 && (
          <section className="mt-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 mb-2">
              {t("rulesLabel")}
            </p>
            <ul className="space-y-1.5">
              {safeRules.map((rule, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-300 leading-relaxed flex gap-2"
                >
                  <span className="text-cyan-400/60 mt-0.5">▸</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <p className="text-[10px] tracking-[0.3em] uppercase text-amber-400/80 mb-2">
            {t("rewardsLabel")}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t("rewardsDescription")}
          </p>
        </section>

        <section className="mt-5 border border-red-500/30 bg-red-950/20 rounded p-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-red-400 mb-2">
            {t("warningLabel")}
          </p>
          <p className="text-xs text-red-200/90 leading-relaxed">
            {t("warningBody")}
          </p>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-3 border border-slate-700 rounded text-slate-300 text-xs uppercase tracking-widest hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-3 bg-cyan-500/20 border border-cyan-400 rounded text-cyan-100 text-xs uppercase tracking-widest hover:bg-cyan-500/30 active:scale-[0.98] transition-all drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
          >
            {t("confirm")}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
