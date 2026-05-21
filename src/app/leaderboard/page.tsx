import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { getLeaderboard } from "@/app/actions/leaderboard";
import LeaderboardView from "@/components/LeaderboardView";

export const metadata = {
  title: "Leaderboard · The System",
  description:
    "Weekly activity ranking. Action counts weighted by difficulty, the harder the action, the more it moves you.",
};

export default async function LeaderboardPage() {
  const { userId } = await auth();
  if (!userId) return <main className="min-h-screen bg-slate-950" />;

  const t = await getTranslations("leaderboard");

  // Page shell renders immediately; the heavy getLeaderboard call
  // (N user snapshots) streams in below via Suspense. Without this
  // split the whole route blocks on rebuilding every user's snapshot
  // on cold cache, which can be several seconds at ~20 hunters.
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {t("title")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <p className="text-[11px] text-slate-300 mt-3 max-w-sm mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardData />
        </Suspense>
      </div>
    </main>
  );
}

async function LeaderboardData() {
  let initial: Awaited<ReturnType<typeof getLeaderboard>> = {
    scope: "global",
    kind: "hunters",
    rows: [],
    viewerRow: null,
  };
  try {
    initial = await getLeaderboard("global");
  } catch {
    // empty fallback, view renders the empty state
  }
  return <LeaderboardView initial={initial} />;
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-14 bg-slate-900/60 border border-slate-800/60 rounded-lg"
        />
      ))}
    </div>
  );
}
