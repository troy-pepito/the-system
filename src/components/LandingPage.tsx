"use client";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { DUNGEONS } from "@/lib/dungeons";

const STEPS = [
  {
    num: "01",
    title: "Awaken",
    description:
      "The System chooses you. Name your hunter. Enter the gate.",
  },
  {
    num: "02",
    title: "Dungeon",
    description:
      "Pick the battles that matter. Track them daily. No excuses.",
  },
  {
    num: "03",
    title: "Rank Up",
    description:
      "E to S rank. Real progress across five human dimensions.",
  },
];

export default function LandingPage() {
  const { openSignIn } = useClerk();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <section className="relative overflow-hidden border-b border-cyan-500/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12)_0%,transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(34,211,238,0.02)_3px,rgba(34,211,238,0.02)_4px)]" />
        <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28 text-center">
          <p className="text-[10px] tracking-[0.5em] text-cyan-400/70 uppercase mb-6 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            [ Shivaliva Leveling ]
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-cyan-100 leading-tight mb-6">
            Face your shadows.
            <br />
            Rank up in real life.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            A gamified self-improvement system for the compulsions
            nobody&apos;s watching. Built for hunters who want real progress,
            not streaks on paper.
          </p>
          <button
            onClick={() => openSignIn()}
            className="group relative px-10 py-4 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-sm uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)]"
          >
            <span className="absolute inset-0 bg-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            <span className="relative">Accept the System</span>
          </button>
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
              <p className="text-sm font-bold text-cyan-100 uppercase tracking-wider mb-2">
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
          Seven Portals
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {DUNGEONS.map((d) => (
            <div
              key={d.id}
              className="border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex items-start justify-between mb-2 gap-3">
                <p className="text-sm font-bold text-cyan-100">{d.name}</p>
                <span className="text-[10px] text-amber-400 tracking-wider flex-shrink-0">
                  {d.rank} RANK
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TROY — rewrite this block in your own voice. The draft below is a scaffold. */}
      <section className="max-w-2xl mx-auto px-6 py-16 border-t border-slate-800/60">
        <div className="border border-slate-800 bg-slate-900/40 p-8">
          <p className="text-xs tracking-[0.3em] uppercase text-cyan-400/70 mb-5">
            Why this exists
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            I built this because I needed it. After a rough breakup I
            started spiraling — doomscrolling, broken sleep, compulsions
            I didn&apos;t want to admit to anyone.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            I couldn&apos;t talk my way out of it, and pep talks
            didn&apos;t stick. What did stick was a system: structured,
            honest, and gamified enough that showing up became a habit
            instead of a chore.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            If any of this lands for you, you&apos;re not alone.
            <br />
            — Troy
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-20 text-center border-t border-slate-800/60">
        <p className="text-sm sm:text-base text-slate-300 mb-8 tracking-widest">
          The quest remains open.
        </p>
        <button
          onClick={() => openSignIn()}
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