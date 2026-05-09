"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  getLeaderboard,
  type GuildLeaderboardRow,
  type LeaderboardResult,
  type LeaderboardRow,
  type LeaderboardScope,
} from "@/app/actions/leaderboard";
import { getRankStyle } from "@/lib/rankStyle";

interface LeaderboardViewProps {
  initial: LeaderboardResult;
}

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "friends", label: "Friends" },
  { id: "guild", label: "Guild" },
  { id: "guilds", label: "Guilds" },
];

/**
 * Tabbed leaderboard. Switching scope re-runs the server action via
 * useTransition so the rest of the page stays interactive while the
 * fetch is in flight. The "guilds" scope flips the row shape from
 * individual hunters to whole-guild aggregates — handled by the
 * `kind` discriminator on LeaderboardResult.
 */
export default function LeaderboardView({ initial }: LeaderboardViewProps) {
  const [data, setData] = useState<LeaderboardResult>(initial);
  const [pending, startTransition] = useTransition();

  function switchScope(scope: LeaderboardScope) {
    if (data.scope === scope || pending) return;
    startTransition(async () => {
      try {
        const next = await getLeaderboard(scope);
        setData(next);
      } catch {
        // keep showing previous data on error
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-md flex-wrap">
        {SCOPES.map((s) => {
          const active = data.scope === s.id;
          return (
            <button
              key={s.id}
              onClick={() => switchScope(s.id)}
              disabled={pending}
              className={`px-4 py-1.5 text-[10px] tracking-[0.25em] font-bold rounded transition-all uppercase ${
                active
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                  : "text-slate-500 border border-transparent hover:text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {data.kind === "guilds"
        ? renderGuilds(data.rows, data.viewerRow)
        : renderHunters(data.rows, data.viewerRow, data.scope)}
    </div>
  );
}

function renderHunters(
  rows: LeaderboardRow[],
  viewerRow: LeaderboardRow | null,
  scope: "global" | "friends" | "guild"
) {
  if (rows.length === 0) return <EmptyState scope={scope} />;
  const viewerInList = !!viewerRow && rows.some((r) => r.isViewer);
  return (
    <>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <HunterRowCard key={row.hunterId} row={row} />
        ))}
      </ul>
      {viewerRow && !viewerInList && (
        <>
          <YourRankDivider />
          <ul className="space-y-1.5">
            <HunterRowCard row={viewerRow} />
          </ul>
        </>
      )}
    </>
  );
}

function renderGuilds(
  rows: GuildLeaderboardRow[],
  viewerRow: GuildLeaderboardRow | null
) {
  if (rows.length === 0) return <EmptyState scope="guilds" />;
  const viewerInList = !!viewerRow && rows.some((r) => r.isViewerGuild);
  return (
    <>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <GuildRowCard key={row.slug} row={row} />
        ))}
      </ul>
      {viewerRow && !viewerInList && (
        <>
          <YourRankDivider label="Your Guild" />
          <ul className="space-y-1.5">
            <GuildRowCard row={viewerRow} />
          </ul>
        </>
      )}
    </>
  );
}

function YourRankDivider({ label = "Your Rank" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-cyan-500/20" />
      <p className="text-[9px] tracking-[0.3em] uppercase text-slate-500">
        {label}
      </p>
      <div className="flex-1 h-px bg-cyan-500/20" />
    </div>
  );
}

function positionStyle(pos: number): string {
  if (pos === 1)
    return "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]";
  if (pos === 2) return "text-slate-200";
  if (pos === 3) return "text-amber-600/80";
  return "text-slate-500";
}

function HunterRowCard({ row }: { row: LeaderboardRow }) {
  const rankStyle = getRankStyle(row.rank);
  return (
    <li>
      <Link
        href={`/h/${row.hunterId}`}
        className={`flex items-center gap-3 border rounded-md p-3 transition-colors ${
          row.isViewer
            ? "bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
            : "bg-slate-900/60 border-slate-800 hover:border-cyan-500/40"
        }`}
      >
        <p
          className={`shrink-0 w-9 text-center font-mono tabular-nums text-sm font-bold ${positionStyle(row.position)}`}
        >
          {row.position}
        </p>
        <div className="shrink-0 w-9 h-9 overflow-hidden border border-cyan-500/30 bg-slate-900 rounded-sm">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.imageUrl}
              alt={row.hunterName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cyan-300/40 text-sm font-bold">
              ?
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-cyan-100 truncate font-bold tracking-wider">
            {row.hunterName}
          </p>
          <p className="text-[10px] tracking-widest uppercase text-slate-500">
            Lvl {row.level} ·{" "}
            <span className={rankStyle.text}>{row.rank}</span>
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-base font-bold tabular-nums text-cyan-200">
            {row.weeklyActivityPoints}
          </span>
          <span className="ml-1 text-[9px] tracking-[0.25em] uppercase text-slate-500">
            pts
          </span>
        </p>
      </Link>
    </li>
  );
}

function GuildRowCard({ row }: { row: GuildLeaderboardRow }) {
  return (
    <li>
      <Link
        href={`/g/${row.slug}`}
        className={`flex items-center gap-3 border rounded-md p-3 transition-colors ${
          row.isViewerGuild
            ? "bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
            : "bg-slate-900/60 border-slate-800 hover:border-cyan-500/40"
        }`}
      >
        <p
          className={`shrink-0 w-9 text-center font-mono tabular-nums text-sm font-bold ${positionStyle(row.position)}`}
        >
          {row.position}
        </p>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-cyan-100 truncate font-bold tracking-wider">
            {row.name}
          </p>
          <p className="text-[10px] tracking-widest uppercase text-slate-500">
            {row.memberCount} member{row.memberCount === 1 ? "" : "s"} ·{" "}
            <span className="text-cyan-300/70">{row.avgActivityPoints}</span>{" "}
            avg
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-base font-bold tabular-nums text-cyan-200">
            {row.totalActivityPoints}
          </span>
          <span className="ml-1 text-[9px] tracking-[0.25em] uppercase text-slate-500">
            pts
          </span>
        </p>
      </Link>
    </li>
  );
}

function EmptyState({ scope }: { scope: LeaderboardScope }) {
  let copy: string;
  if (scope === "friends") {
    copy = "Add friends to see how you stack up against your circle this week.";
  } else if (scope === "guild") {
    copy = "Join a guild first to see its weekly activity ranking.";
  } else if (scope === "guilds") {
    copy = "No guilds yet — forge the first one and start a rivalry.";
  } else {
    copy = "No hunters tracked yet — be the first to post a number.";
  }
  return (
    <div className="border border-slate-800 rounded-lg p-6 text-center">
      <p className="text-xs text-slate-500 leading-relaxed">{copy}</p>
    </div>
  );
}
