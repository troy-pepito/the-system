export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 animate-pulse">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/40">
            Hunter Profile
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>
        <div className="h-44 border border-cyan-400/20 bg-slate-950/60" />
        <div className="h-32 border border-slate-800 rounded" />
        <div className="h-40 border border-slate-800 rounded" />
      </div>
    </main>
  );
}
