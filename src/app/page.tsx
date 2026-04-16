import StatCard from "@/components/StatCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Player Status Window
          </p>
          <h1 className="text-5xl font-bold text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] tracking-widest uppercase">
            The System
          </h1>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <div className="bg-slate-900/80 rounded-xl p-6 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <h2 className="text-sm tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Awakening Status
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Rank</p>
              <p className="text-2xl font-bold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">E</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Level</p>
              <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">1</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Stats
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <StatCard name="STR" value={5} />
            <StatCard name="AGI" value={3} />
            <StatCard name="INT" value={8} />
            <StatCard name="VIT" value={4} />
          </div>
        </div>
      </div>
    </main>
  );
}
