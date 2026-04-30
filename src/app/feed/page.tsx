import { auth } from "@clerk/nextjs/server";
import { getPublicFeed } from "@/app/actions/feed";
import FeedList from "@/components/FeedList";

export const metadata = {
  title: "Feed — Shivaliva Leveling",
  description:
    "Public reflections from hunters across the system. Journals, victories, relapses — shared with the community.",
};

export default async function FeedPage() {
  const { userId } = await auth();
  if (!userId) {
    return <main className="min-h-screen bg-slate-950" />;
  }

  const initial = await getPublicFeed();

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            The Feed
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <p className="text-[11px] text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
            Public reflections from hunters across the system. Tap a name to
            view their profile.
          </p>
        </div>

        <FeedList
          initialEntries={initial.entries}
          initialCursor={initial.nextCursor}
        />
      </div>
    </main>
  );
}
