"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";
import {
  HUNTER_TYPE_LIST,
  type HunterType,
} from "@/lib/hunterType";

const AWAKENED_KEY = "system:awakened";
const AWAKENED_EVENT = "system:awakened-changed";

type Phase = "intro" | "naming" | "path";

function subscribeAwakened(cb: () => void) {
  window.addEventListener(AWAKENED_EVENT, cb);
  return () => window.removeEventListener(AWAKENED_EVENT, cb);
}

function getAwakenedSnapshot() {
  return localStorage.getItem(AWAKENED_KEY) === "true";
}

function getAwakenedServerSnapshot() {
  return true;
}

export default function AwakeningOverlay() {
  const tHunterTypes = useTranslations("hunterTypes");
  const t = useTranslations("awakening");
  const INTRO_LINES = t.raw("intro") as string[];
  const NAME_LINES = t.raw("naming") as string[];
  const PATH_LINES = t.raw("path") as string[];
  const awakened = useSyncExternalStore(
    subscribeAwakened,
    getAwakenedSnapshot,
    getAwakenedServerSnapshot
  );
  const { user, isLoaded, isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [accepted, setAccepted] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [declined, setDeclined] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Brief fade between phases. Without it the card snaps to a new
  // height + restarts the typing animation in the same frame, which
  // reads as a flicker.
  const [phaseTransitioning, setPhaseTransitioning] = useState(false);

  const activeLines =
    phase === "path"
      ? PATH_LINES
      : phase === "naming"
        ? NAME_LINES
        : INTRO_LINES;

  useEffect(() => {
    if (accepted && isSignedIn && phase === "intro") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("naming");
      setLineIdx(0);
      setCharIdx(0);
    }
  }, [accepted, isSignedIn, phase]);

  // Backfill the localStorage AWAKENED_KEY when the user signs in on a
  // device that doesn't have it (e.g. a sign-out wiped it, or they're
  // on a new device). We treat the presence of unsafeMetadata.hunterName
  // as proof they've already completed awakening, re-running the intro
  // scene every time someone logs back in is the bug Troy hit.
  const hunterName = user?.unsafeMetadata?.hunterName as string | undefined;
  const alreadyHasIdentity = isLoaded && isSignedIn && !!hunterName;
  useEffect(() => {
    if (!alreadyHasIdentity) return;
    // Only backfill while we're still on the intro phase. Once the user
    // reaches naming/path, Clerk's user.update({hunterName}) flips
    // alreadyHasIdentity true mid-flow, backfilling there would unmount
    // the overlay before the path picker can render.
    if (phase !== "intro") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(AWAKENED_KEY) === "true") return;
    try {
      localStorage.setItem(AWAKENED_KEY, "true");
      window.dispatchEvent(new Event(AWAKENED_EVENT));
    } catch {}
  }, [alreadyHasIdentity, phase]);

  useEffect(() => {
    if (awakened) return;
    if (lineIdx >= activeLines.length) return;

    const line = activeLines[lineIdx];
    if (charIdx < line.length) {
      const delay = line === "" ? 0 : charIdx === 0 ? 350 : 28;
      const t = setTimeout(() => setCharIdx(charIdx + 1), delay);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIdx(lineIdx + 1);
      setCharIdx(0);
    }, line === "" ? 120 : 260);
    return () => clearTimeout(t);
  }, [awakened, phase, activeLines, lineIdx, charIdx]);

  function handleAccept() {
    setAccepted(true);
    if (isSignedIn) {
      setPhaseTransitioning(true);
      setTimeout(() => {
        setPhase("naming");
        setLineIdx(0);
        setCharIdx(0);
        setPhaseTransitioning(false);
      }, 300);
    } else {
      openSignIn();
    }
  }

  function handleDecline() {
    setDeclined(true);
  }

  function handleReconsider() {
    setDeclined(false);
    setAccepted(false);
    setPhase("intro");
    setLineIdx(0);
    setCharIdx(0);
  }

  async function handleSubmitName() {
    const name = nameInput.trim();
    if (!name || !user) return;
    setError(null);
    setSubmitting(true);
    try {
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, hunterName: name },
      });
      // Transition to path-selection rather than finishing awakening,
      // gives the new player a chance to declare their identity before
      // they hit the dashboard.
      setPhaseTransitioning(true);
      setTimeout(() => {
        setPhase("path");
        setLineIdx(0);
        setCharIdx(0);
        setSubmitting(false);
        setPhaseTransitioning(false);
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registrationFailed"));
      setSubmitting(false);
    }
  }

  async function handlePathChoice(type: HunterType | null) {
    if (!user || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (type !== null) {
        await user.update({
          unsafeMetadata: { ...user.unsafeMetadata, hunterType: type },
        });
      }
      track("awakening_complete", {
        hunter_type: type ?? "unaffiliated",
      });
      setAccepting(true);
      setTimeout(() => {
        localStorage.setItem(AWAKENED_KEY, "true");
        window.dispatchEvent(new Event(AWAKENED_EVENT));
        // Land on Status (the dashboard) instead of /guide. The
        // previous /guide destination dropped a freshly-awakened
        // hunter into an 11-section manual before they'd done a
        // single thing, high bounce risk. Status shows Daily
        // Quests immediately + the Portal Registry CTA, so the
        // first action is one tap away. /guide is still linked
        // from the landing-page footer and from /portals for
        // hunters who want the manual.
        router.push("/");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pathFailed"));
      setSubmitting(false);
    }
  }

  if (awakened) return null;
  if (!isLoaded) return null;
  if (!isSignedIn) return null;
  // Already-completed awakening, render nothing while the effect
  // above backfills the localStorage flag. Only fires on intro phase:
  // during naming/path, alreadyHasIdentity flips true mid-flow as
  // soon as user.update({hunterName}) resolves, and we must keep the
  // overlay mounted so the path picker can render.
  if (alreadyHasIdentity && phase === "intro") return null;

  const complete = lineIdx >= activeLines.length;

  const renderLine = (text: string, key: string | number, partial = false) => {
    const isHeader = text.startsWith("[");
    return (
      <p
        key={key}
        className={
          isHeader
            ? "text-[10px] tracking-[0.5em] text-cyan-400/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
            : "text-sm sm:text-base tracking-widest text-cyan-200"
        }
      >
        {text || " "}
        {partial && <span className="inline-block w-[0.6em] ml-0.5 bg-cyan-300 animate-pulse">&nbsp;</span>}
      </p>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center px-6 transition-opacity duration-700 ${
        accepting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08)_0%,transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(34,211,238,0.02)_3px,rgba(34,211,238,0.02)_4px)]" />

      <div className="relative max-w-md w-full mx-auto">
        <div className="absolute -inset-px border border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.4),inset_0_0_20px_rgba(34,211,238,0.1)] pointer-events-none" />
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />

        <div
          className={`relative bg-slate-950/80 p-10 sm:p-12 transition-opacity duration-300 ${
            phaseTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          {declined ? (
            <div className="min-h-[260px] flex flex-col items-center justify-center space-y-6 font-mono text-center">
              <p className="text-[10px] tracking-[0.5em] text-slate-500">{t("standbyHeader")}</p>
              <p className="text-sm tracking-widest text-slate-300">
                {t("standbyMessage")}
              </p>
              <p className="text-xs tracking-wider text-slate-600 max-w-xs">
                {t("standbySubtext")}
              </p>
              <button
                onClick={handleReconsider}
                className="mt-4 text-xs text-cyan-400/70 hover:text-cyan-200 tracking-[0.3em] uppercase transition-colors"
              >
                {t("reconsider")}
              </button>
            </div>
          ) : phase === "path" ? (
            <>
              <div className="min-h-[260px] space-y-3 font-mono text-center">
                {PATH_LINES.slice(0, lineIdx).map((line, i) =>
                  renderLine(line, i)
                )}
                {!complete &&
                  lineIdx < PATH_LINES.length &&
                  renderLine(
                    PATH_LINES[lineIdx].slice(0, charIdx),
                    "current",
                    true
                  )}
              </div>

              <div
                key="path-controls"
                className={`mt-6 space-y-2 transition-all duration-700 ${
                  complete
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                {HUNTER_TYPE_LIST.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => handlePathChoice(def.id)}
                    disabled={submitting}
                    className={`w-full text-left p-3 border rounded transition-all disabled:opacity-50 ${def.badgeStyle} hover:brightness-125 ${def.glow}`}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {tHunterTypes(`${def.id}.label`)}
                      </span>
                      <span className="text-[9px] italic opacity-80 truncate">
                        {tHunterTypes(`${def.id}.tagline`)}
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePathChoice(null)}
                  disabled={submitting}
                  className="w-full p-2 border border-slate-700 rounded text-slate-300 text-[10px] uppercase tracking-[0.3em] hover:border-slate-500 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  {t("noPath")}
                </button>
                {error && (
                  <p className="text-[10px] text-red-400 tracking-wider text-center pt-1">
                    {error}
                  </p>
                )}
              </div>
            </>
          ) : phase === "intro" ? (
            <>
              <div className="min-h-[260px] space-y-3 font-mono text-center">
                {INTRO_LINES.slice(0, lineIdx).map((line, i) => renderLine(line, i))}
                {!complete &&
                  lineIdx < INTRO_LINES.length &&
                  renderLine(INTRO_LINES[lineIdx].slice(0, charIdx), "current", true)}
              </div>

              <div
                key="intro-controls"
                className={`flex gap-4 mt-10 justify-center transition-all duration-700 ${
                  complete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <button
                  onClick={handleAccept}
                  className="group relative px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
                >
                  <span className="absolute inset-0 bg-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                  <span className="relative">{t("accept")}</span>
                </button>
                <button
                  onClick={handleDecline}
                  className="px-8 py-3 border border-slate-700 text-slate-500 text-xs uppercase tracking-[0.4em] hover:border-slate-600 hover:text-slate-400 transition-colors"
                >
                  {t("decline")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="min-h-[260px] space-y-3 font-mono text-center">
                {NAME_LINES.slice(0, lineIdx).map((line, i) => renderLine(line, i))}
                {!complete &&
                  lineIdx < NAME_LINES.length &&
                  renderLine(NAME_LINES[lineIdx].slice(0, charIdx), "current", true)}
              </div>

              <div
                key="naming-controls"
                className={`mt-8 flex flex-col items-center gap-4 transition-all duration-700 ${
                  complete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitName();
                  }}
                  maxLength={30}
                  autoFocus={complete}
                  placeholder={t("namePlaceholder")}
                  disabled={submitting}
                  className="w-64 px-4 py-2 bg-transparent border border-cyan-400/60 text-cyan-100 font-mono text-sm tracking-widest text-center placeholder:text-cyan-900 focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                />
                <button
                  onClick={handleSubmitName}
                  disabled={!nameInput.trim() || submitting || !isLoaded}
                  className="group relative px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-500/20 disabled:hover:text-cyan-100 disabled:shadow-none"
                >
                  <span className="relative">
                    {submitting ? t("registering") : t("register")}
                  </span>
                </button>
                {error && (
                  <p className="text-[10px] text-red-400 tracking-wider">{error}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}