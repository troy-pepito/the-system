import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getGuildBySlug } from "@/app/actions/guilds";
import GuildPanel from "@/components/GuildPanel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  // Title-only metadata read — full guild detail is fetched on the
  // page itself with the viewer's auth context.
  return {
    title: `${slug} — Shivaliva Leveling`,
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

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <GuildPanel initial={guild} slug={slug} />
      </div>
    </main>
  );
}
