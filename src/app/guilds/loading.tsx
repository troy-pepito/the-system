/**
 * Instant skeleton for /guilds. Shown while getMyGuild + browseGuilds
 * resolve server-side. Cold cache + many guilds = the perceived 1–2s
 * stall the user reported.
 */
export default function GuildsLoading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <div className="h-3 w-24 mx-auto bg-cyan-500/20 rounded animate-pulse" />
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="mt-3 h-2.5 w-72 max-w-full mx-auto bg-slate-800 rounded animate-pulse" />
        </div>

        {/* Your Guild / Forge form placeholder card. */}
        <div className="relative bg-slate-950/80 border border-cyan-400/40 p-5 space-y-3">
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />
          <div className="h-2.5 w-20 bg-cyan-500/20 rounded animate-pulse" />
          <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-full bg-slate-800/60 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-slate-800/60 rounded animate-pulse" />
        </div>

        <div className="h-3 w-20 bg-slate-800 rounded animate-pulse" />
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2"
            >
              <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
              <div className="h-2.5 w-48 bg-slate-800/60 rounded animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
