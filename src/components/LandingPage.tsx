"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DUNGEONS, dungeonDims, DIM_STYLE } from "@/lib/dungeons";
import { dungeonKey } from "@/lib/i18nKeys";
import LandingShaderBg from "@/components/LandingShaderBg";
import { setLocale } from "@/app/actions/locale";
import { LOCALE_OPTIONS, type Locale } from "@/i18n/config";
import {
  detectInstallState,
  subscribeInstallState,
  triggerInstall,
  type InstallState,
} from "@/lib/pwaInstall";

const STEPS = [
  {
    num: "01",
    title: "Awaken",
    description:
      "Name your hunter, choose a Path, and enter the System. Your run begins the moment you accept.",
  },
  {
    num: "02",
    title: "Pick Your Dungeons",
    description:
      "A dungeon is a habit you're fighting — NoFap, no doomscroll, sensory reset, gym, diet, social anxiety. Pick the ones that matter.",
  },
  {
    num: "03",
    title: "Show Up Daily",
    description:
      "Check in cleared days, tick workouts, log exposures. Banked progress stacks. Climb ranks E → S.",
  },
];

export default function LandingPage() {
  const tDungeons = useTranslations("dungeons");
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleAccept = () => {
    if (isSignedIn) {
      router.push("/");
    } else {
      openSignIn();
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <LandingLanguagePicker />
      </div>
      <section className="relative overflow-hidden border-b border-cyan-500/20">
        <LandingShaderBg />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12)_0%,transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(34,211,238,0.02)_3px,rgba(34,211,238,0.02)_4px)]" />
        <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28 text-center">
          <p
            className="text-[10px] tracking-[0.5em] text-cyan-400/70 uppercase mb-6 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-reveal"
            style={{ animationDelay: "0.05s" }}
          >
            [ Shivaliva Leveling ]
          </p>
          <h1
            className="font-display text-aberration text-3xl sm:text-5xl font-bold tracking-tight text-cyan-100 leading-tight mb-6 animate-reveal"
            style={{ animationDelay: "0.2s" }}
          >
            Face your shadows.
            <br />
            Rank up in real life.
          </h1>
          <p
            className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed animate-reveal"
            style={{ animationDelay: "0.45s" }}
          >
            A gamified self-improvement system for the compulsions
            nobody&apos;s watching. Built for hunters who want real progress,
            not streaks on paper.
          </p>
          <button
            onClick={handleAccept}
            className="group relative px-10 py-4 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-sm uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)] animate-reveal"
            style={{ animationDelay: "0.7s" }}
          >
            <span className="absolute inset-0 bg-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            <span className="relative">Accept the System</span>
          </button>
          <div
            className="mt-5 animate-reveal"
            style={{ animationDelay: "0.9s" }}
          >
            <Link
              href="/guide"
              className="text-[10px] tracking-[0.4em] uppercase text-slate-500 hover:text-cyan-300 transition-colors"
            >
              Read the Hunter Guide →
            </Link>
          </div>

          <div
            className="animate-reveal"
            style={{ animationDelay: "1.1s" }}
          >
            <div className="animate-float-slow">
              <StatusWindowPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs tracking-[0.3em] uppercase text-cyan-400/70 text-center mb-10">
          How it works
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="border border-slate-800 bg-slate-900/40 p-6"
            >
              <p className="text-[10px] tracking-[0.4em] text-cyan-400/60 mb-3">
                {s.num}
              </p>
              <p className="font-display text-sm font-bold text-cyan-100 uppercase tracking-wider mb-2">
                {s.title}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-800/60">
        <p className="text-xs tracking-[0.3em] uppercase text-cyan-400/70 text-center mb-10">
          The Portals
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {DUNGEONS.map((d) => (
            <div
              key={d.id}
              className="border border-slate-800 bg-slate-900/40 p-5"
            >
              <p className="font-display text-sm font-bold text-cyan-100 mb-2 flex items-center gap-2">
                {d.icon && (
                  <span aria-hidden className="leading-none">
                    {d.icon}
                  </span>
                )}
                <span>{tDungeons(`${dungeonKey(d.id)}.name`)}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {dungeonDims(d).map((dim) => (
                  <span
                    key={dim}
                    className={`text-[9px] font-bold uppercase tracking-[0.25em] px-1.5 py-0.5 border rounded-sm ${DIM_STYLE[dim]}`}
                  >
                    {dim}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {tDungeons(`${dungeonKey(d.id)}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16 border-t border-slate-800/60">
        <div className="border border-slate-800 bg-slate-900/40 p-8">
          <p className="text-xs tracking-[0.3em] uppercase text-cyan-400/70 mb-5">
            Why this exists
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            I made this during a dark chapter — for myself, first. I needed a
            system that made discipline feel less like willpower and more
            like a game I could show up to every day.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            Now it&apos;s here for anyone yearning for the same: people
            fighting compulsions, people losing to procrastination, people
            who know they need accountability but have no one to hold them
            to it.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            If that&apos;s you, welcome.
            <br />
            — Trojan Bulldog
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-20 text-center border-t border-slate-800/60">
        <p className="text-sm sm:text-base text-slate-300 mb-4 tracking-widest">
          The quest remains open.
        </p>
        <p className="text-[10px] tracking-[0.4em] uppercase text-slate-500 mb-8">
          Free to play
        </p>
        <button
          onClick={handleAccept}
          className="group relative px-10 py-4 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-sm uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)]"
        >
          <span className="absolute inset-0 bg-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
          <span className="relative">Accept the System →</span>
        </button>
      </section>

      <footer className="border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] tracking-[0.3em] uppercase text-slate-500">
          <p>© Shivaliva Leveling</p>
          <div className="flex items-center gap-6">
            <Link
              href="/guide"
              className="hover:text-cyan-300 transition-colors"
            >
              Guide
            </Link>
            <Link
              href="/privacy"
              className="hover:text-cyan-300 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-cyan-300 transition-colors"
            >
              Terms
            </Link>
            <InstallFooterLink />
            <a
              href="mailto:trojanato@gmail.com"
              className="hover:text-cyan-300 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function LandingLanguagePicker() {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === current) return;
    startTransition(async () => {
      await setLocale(next);
    });
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={pending}
      aria-label="Language"
      className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 rounded text-cyan-200 text-[10px] uppercase tracking-wider px-2 py-1.5 hover:border-cyan-400/60 focus:border-cyan-400 focus:outline-none transition-colors disabled:opacity-50 cursor-pointer"
    >
      {LOCALE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-slate-900">
          {opt.native}
        </option>
      ))}
    </select>
  );
}

function InstallFooterLink() {
  const [state, setState] = useState<InstallState>("loading");

  useEffect(() => {
    const update = () => setState(detectInstallState());
    update();
    return subscribeInstallState(update);
  }, []);

  // Only render when programmatic install is actually available — for
  // iOS / unsupported / already-installed users, the link in the footer
  // would be confusing or redundant. iOS users find install steps via
  // the Guide link already in the same footer row.
  if (state !== "available") return null;

  return (
    <button
      type="button"
      onClick={() => triggerInstall()}
      className="hover:text-cyan-300 transition-colors uppercase tracking-[0.3em]"
    >
      Install App
    </button>
  );
}

function StatusWindowPreview() {
  const entries: { label: string; xp: string; tone: "cyan" | "amber" }[] = [
    { label: "NoFap · Day Cleared", xp: "+10 XP", tone: "cyan" },
    { label: "Daily Quest · Morning Walk", xp: "+15 XP", tone: "cyan" },
    { label: "Training Regimen · Full Body", xp: "+25 XP", tone: "cyan" },
    { label: "14-Day Combo", xp: "+100 XP", tone: "amber" },
  ];
  return (
    <div className="relative mx-auto max-w-md mt-16 text-left">
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 z-10 pointer-events-none" />
      <div className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.25),inset_0_0_20px_rgba(34,211,238,0.05)] p-5 sm:p-6">
        <p className="text-[9px] text-cyan-400/70 tracking-[0.4em] uppercase mb-5">
          Hunter Status Window
        </p>
        <div className="flex items-center gap-6 mb-5">
          <div>
            <p className="text-[9px] text-slate-500 tracking-widest uppercase">
              Rank
            </p>
            <div className="relative w-12 h-12 mt-1 flex items-center justify-center">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full opacity-60 animate-core-spin"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.55) 90deg, transparent 180deg, rgba(34,211,238,0.45) 270deg, transparent 360deg)",
                  filter: "blur(3px)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-[3px] rounded-full bg-slate-950/90"
              />
              <p className="relative font-display text-3xl font-bold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)] leading-none">
                A
              </p>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <div>
            <p className="text-[9px] text-slate-500 tracking-widest uppercase">
              Level
            </p>
            <p className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)] leading-none mt-1">
              34
            </p>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">
              <span>Progress</span>
              <span className="font-mono text-amber-300/80">420 / 900</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                style={{ width: "46%" }}
              />
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-3 space-y-2">
          {entries.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-300 truncate pr-3">{e.label}</span>
              <span
                className={`font-mono shrink-0 ${
                  e.tone === "amber"
                    ? "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                    : "text-cyan-300"
                }`}
              >
                {e.xp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}