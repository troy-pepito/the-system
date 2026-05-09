import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { browseGuilds, getMyGuild } from "@/app/actions/guilds";
import GuildCreateForm from "@/components/GuildCreateForm";
import { GUILD_MEMBER_CAP } from "@/lib/guilds";

export const metadata = {
  title: "Guilds — The System",
  description:
    "Find your hunters. Guilds are small bands of allies pushing the same kind of training together.",
};

export default async function GuildsPage() {
  const { userId } = await auth();
  if (!userId) return <main className="min-h-screen bg-slate-950" />;

  const t = await getTranslations("guildsPage");

  // Tolerate failures — if either throws (offline / DB blip), the page
  // still renders something useful instead of dropping into Next's
  // error fallback.
  let myGuild: Awaited<ReturnType<typeof getMyGuild>> = null;
  let directory: Awaited<ReturnType<typeof browseGuilds>> = [];
  try {
    [myGuild, directory] = await Promise.all([getMyGuild(), browseGuilds()]);
  } catch {
    // empty fallback
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {t("title")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <p className="text-[11px] text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {myGuild ? <YourGuildCard guild={myGuild} /> : <GuildCreateForm />}

        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-3">
            {myGuild ? t("otherGuilds") : t("browse")}
          </p>
          {directory.length === 0 ? (
            <div className="border border-slate-800 rounded-lg p-6 text-center">
              <p className="text-xs text-slate-500">{t("empty")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {directory
                .filter((g) => !myGuild || g.slug !== myGuild.slug)
                .map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/g/${g.slug}`}
                      className="block bg-slate-900/60 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold tracking-wider text-cyan-200">
                            {g.name}
                          </p>
                          {g.description && (
                            <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2">
                              {g.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] tracking-widest uppercase text-slate-500">
                            {t("membersShort", { count: g.memberCount })}
                          </p>
                          <p
                            className={`text-[9px] tracking-[0.2em] uppercase mt-0.5 ${
                              g.spotsLeft === 0
                                ? "text-red-400/80"
                                : "text-cyan-400/70"
                            }`}
                          >
                            {g.spotsLeft === 0
                              ? t("full")
                              : t("spotsLeft", { count: g.spotsLeft })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

async function YourGuildCard({
  guild,
}: {
  guild: NonNullable<Awaited<ReturnType<typeof getMyGuild>>>;
}) {
  const t = await getTranslations("guildsPage");
  return (
    <Link
      href={`/g/${guild.slug}`}
      className="block relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.05)] p-5 hover:border-cyan-300/60 transition-colors"
    >
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

      <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70">
        {t("yourGuild")}
      </p>
      <p className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100 mt-1">
        {guild.name}
      </p>
      {guild.description && (
        <p className="text-xs text-slate-300 leading-relaxed mt-2">
          {guild.description}
        </p>
      )}
      <div className="flex items-center gap-3 mt-3 text-[10px] tracking-widest uppercase text-slate-400">
        <span>
          {t("membersCount", {
            count: guild.memberCount,
            cap: GUILD_MEMBER_CAP,
          })}
        </span>
        {guild.viewerStatus === "owner" && guild.pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
            {t("pending", { count: guild.pendingCount })}
          </span>
        )}
        {guild.viewerStatus === "owner" && (
          <span className="text-cyan-400/70">{t("owner")}</span>
        )}
      </div>
    </Link>
  );
}
