/**
 * Streamed instantly while the leaderboard page does its server-side
 * data fetch. The board's hot path runs buildSnapshot for every hunter
 * (and every member of every guild on the Guilds tab), which can take
 * 1–2s on cold cache. Without this, the previous page froze in place
 * during navigation. With it, the user sees the page chrome + a
 * pulsing skeleton immediately.
 */
export default function LeaderboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <div className="h-3 w-32 mx-auto bg-cyan-500/20 rounded animate-pulse" />
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="mt-3 h-2.5 w-64 mx-auto bg-slate-800 rounded animate-pulse" />
        </div>

        {/* Tab strip skeleton, matches the real 4-tab equal-share row. */}
        <div className="flex items-stretch gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-md">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 h-7 bg-slate-800/60 rounded animate-pulse"
            />
          ))}
        </div>

        <ul className="space-y-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li
              key={i}
              className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-md p-3"
            >
              <div className="shrink-0 w-9 h-7 bg-slate-800 rounded animate-pulse" />
              <div className="shrink-0 w-9 h-9 bg-slate-800 border border-cyan-500/30 rounded-sm animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="h-2.5 w-20 bg-slate-800/60 rounded animate-pulse" />
              </div>
              <div className="shrink-0 w-12 h-5 bg-slate-800 rounded animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
