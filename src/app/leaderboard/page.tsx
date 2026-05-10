import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { getLeaderboard } from "@/app/actions/leaderboard";
import LeaderboardView from "@/components/LeaderboardView";

export const metadata = {
  title: "Leaderboard, The System",
  description:
    "Weekly activity ranking. Action counts weighted by difficulty, the harder the action, the more it moves you.",
};

export default async function LeaderboardPage() {
  const { userId } = await auth();
  if (!userId) return <main className="min-h-screen bg-slate-950" />;

  const t = await getTranslations("leaderboard");

  // Default to the global view on the server. The client component
  // re-fetches when the viewer switches scope so the initial paint is
  // useful even before hydration.
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

        <LeaderboardView initial={initial} />
      </div>
    </main>
  );
}
