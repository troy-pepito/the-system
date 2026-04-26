"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";

const AWAKENED_KEY = "system:awakened";
const AWAKENED_EVENT = "system:awakened-changed";

const INTRO_LINES = [
  "[ NOTIFICATION ]",
  "",
  "A special quest has arrived.",
  "",
  "You have been selected",
  "to become a Player.",
  "",
  "Do you wish to accept?",
];

const NAME_LINES = [
  "[ REGISTRATION ]",
  "",
  "The System recognizes you.",
  "",
  "State the name",
  "you shall be known by.",
];

type Phase = "intro" | "naming";

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

  const activeLines = phase === "naming" ? NAME_LINES : INTRO_LINES;

  useEffect(() => {
    if (accepted && isSignedIn && phase === "intro") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("naming");
      setLineIdx(0);
      setCharIdx(0);
    }
  }, [accepted, isSignedIn, phase]);

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
      setPhase("naming");
      setLineIdx(0);
      setCharIdx(0);
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
      track("awakening_complete", { hunter_name_length: name.length });
      setAccepting(true);
      setTimeout(() => {
        localStorage.setItem(AWAKENED_KEY, "true");
        window.dispatchEvent(new Event(AWAKENED_EVENT));
        router.push("/portals");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setSubmitting(false);
    }
  }

  if (awakened) return null;
  if (!isLoaded) return null;
  if (!isSignedIn) return null;

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

        <div className="relative bg-slate-950/80 p-10 sm:p-12">
          {declined ? (
            <div className="min-h-[260px] flex flex-col items-center justify-center space-y-6 font-mono text-center">
              <p className="text-[10px] tracking-[0.5em] text-slate-500">[ STANDBY ]</p>
              <p className="text-sm tracking-widest text-slate-400">
                The System will wait.
              </p>
              <p className="text-xs tracking-wider text-slate-600 max-w-xs">
                The quest remains open. Return when you are ready to awaken.
              </p>
              <button
                onClick={handleReconsider}
                className="mt-4 text-xs text-cyan-400/70 hover:text-cyan-200 tracking-[0.3em] uppercase transition-colors"
              >
                ← Reconsider
              </button>
            </div>
          ) : phase === "intro" ? (
            <>
              <div className="min-h-[260px] space-y-3 font-mono text-center">
                {INTRO_LINES.slice(0, lineIdx).map((line, i) => renderLine(line, i))}
                {!complete &&
                  lineIdx < INTRO_LINES.length &&
                  renderLine(INTRO_LINES[lineIdx].slice(0, charIdx), "current", true)}
              </div>

              <div
                className={`flex gap-4 mt-10 justify-center transition-all duration-700 ${
                  complete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <button
                  onClick={handleAccept}
                  className="group relative px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
                >
                  <span className="absolute inset-0 bg-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                  <span className="relative">Accept</span>
                </button>
                <button
                  onClick={handleDecline}
                  className="px-8 py-3 border border-slate-700 text-slate-500 text-xs uppercase tracking-[0.4em] hover:border-slate-600 hover:text-slate-400 transition-colors"
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="min-h-[220px] space-y-3 font-mono text-center">
                {NAME_LINES.slice(0, lineIdx).map((line, i) => renderLine(line, i))}
                {!complete &&
                  lineIdx < NAME_LINES.length &&
                  renderLine(NAME_LINES[lineIdx].slice(0, charIdx), "current", true)}
              </div>

              <div
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
                  placeholder="Enter name"
                  disabled={submitting}
                  className="w-64 px-4 py-2 bg-transparent border border-cyan-400/60 text-cyan-100 font-mono text-sm tracking-widest text-center placeholder:text-cyan-900 focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                />
                <button
                  onClick={handleSubmitName}
                  disabled={!nameInput.trim() || submitting || !isLoaded}
                  className="group relative px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-500/20 disabled:hover:text-cyan-100 disabled:shadow-none"
                >
                  <span className="relative">
                    {submitting ? "Registering" : "Register"}
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