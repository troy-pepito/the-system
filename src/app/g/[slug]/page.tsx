import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getGuildBySlug, getGuildFeed } from "@/app/actions/guilds";
import GuildPanel from "@/components/GuildPanel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `${slug} — The System`,
    description: "Guild page — members, requests, weekly activity.",
  };
}

export default async function GuildPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) return <main className="min-h-screen bg-slate-950" />;

  const { slug } = await params;
  let guild: Awaited<ReturnType<typeof getGuildBySlug>> = null;
  try {
    guild = await getGuildBySlug(slug);
  } catch {
    // empty fallback — page will render the not-found state
  }
  if (!guild) notFound();

  // Guild feed is server-side membership-gated — pending applicants and
  // strangers get an empty page back, so we can fetch it eagerly without
  // leaking who's posted what.
  const isMember =
    guild.viewerStatus === "owner" || guild.viewerStatus === "member";
  const feed = isMember
    ? await getGuildFeed(slug).catch(() => ({ entries: [], nextCursor: null }))
    : { entries: [], nextCursor: null };

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <GuildPanel
          initial={guild}
          slug={slug}
          initialFeed={feed.entries}
          initialFeedCursor={feed.nextCursor}
        />
      </div>
    </main>
  );
}
