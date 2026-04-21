"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

const AWAKENED_KEY = "system:awakened";
const AWAKENED_EVENT = "system:awakened-changed";

const LINES = [
  "[ NOTIFICATION ]",
  "",
  "A special quest has arrived.",
  "",
  "You have been selected",
  "to become a Player.",
  "",
  "Do you wish to accept?",
];

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
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [declined, setDeclined] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (awakened) return;
    if (lineIdx >= LINES.length) return;

    const line = LINES[lineIdx];
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
  }, [awakened, lineIdx, charIdx]);

  function handleAccept() {
    setAccepting(true);
    setTimeout(() => {
      localStorage.setItem(AWAKENED_KEY, "true");
      window.dispatchEvent(new Event(AWAKENED_EVENT));
    }, 900);
  }

  function handleDecline() {
    setDeclined(true);
  }

  function handleReconsider() {
    setDeclined(false);
    setLineIdx(0);
    setCharIdx(0);
  }

  if (awakened) return null;

  const complete = lineIdx >= LINES.length;

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
        {text || "\u00a0"}
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
          {!declined ? (
            <>
              <div className="min-h-[260px] space-y-3 font-mono text-center">
                {LINES.slice(0, lineIdx).map((line, i) => renderLine(line, i))}
                {!complete &&
                  lineIdx < LINES.length &&
                  renderLine(LINES[lineIdx].slice(0, charIdx), "current", true)}
              </div>

              <div
                className={`flex gap-4 mt-10 justify-center transition-all duration-700 ${
                  complete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <button
                  onClick={handleAccept}
                  className="group relative px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
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
          )}
        </div>
      </div>
    </div>
  );
}