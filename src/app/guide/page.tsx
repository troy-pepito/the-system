import Link from "next/link";
import {
  DUNGEONS,
  dungeonDims,
  DIM_STYLE,
  type DungeonRuleType,
} from "@/lib/dungeons";
import {
  XP_PER_STREAK_DAY,
  XP_PER_WORKOUT,
  XP_PER_EXPOSURE,
  XP_PER_COMPLETION,
} from "@/lib/player";
import { COMBO_MILESTONES, COMBO_THRESHOLD } from "@/lib/quests";

export const metadata = {
  title: "Hunter Guide — Shivaliva Leveling",
  description:
    "The manual for the System. Ranks, dungeons, dimensions, combos, and what Pro unlocks.",
};

const RULE_LABEL: Record<DungeonRuleType, string> = {
  continuous_streak: "Continuous Streak",
  allowance: "Monthly Allowance",
  cadence: "Weekly Cadence",
  timed: "Timed Run",
  progressive: "Progressive Ladder",
};

const RULE_TYPES: {
  type: DungeonRuleType;
  summary: string;
  used_by: string;
}[] = [
  {
    type: "continuous_streak",
    summary:
      "A daily check-in. Confirm each day as cleared or relapsed in the calendar. Cleared days bank XP + dimensions permanently.",
    used_by: "NoFap",
  },
  {
    type: "allowance",
    summary:
      "A budget per month. Stay under the limit; exceed it and the run resets.",
    used_by: "Caffeine Reboot · Diet Challenge",
  },
  {
    type: "cadence",
    summary:
      "A weekly pattern. Hit your target each week. Miss the cadence and you manually relapse.",
    used_by: "Training Regimen",
  },
  {
    type: "timed",
    summary:
      "A daily check-in toward an N-day target. Same calendar mechanic as the streak dungeons. Claim Victory at the target to retire the run.",
    used_by: "No Doomscroll · Sound Sensitization",
  },
  {
    type: "progressive",
    summary:
      "An escalating ladder. Clear a rung to unlock the next. No skipping.",
    used_by: "Exposure Therapy",
  },
];

const DIMENSIONS: {
  key: keyof typeof DIM_STYLE;
  name: string;
  description: string;
}[] = [
  {
    key: "body",
    name: "BODY",
    description:
      "Physical strength and vitality. Earned from workouts and dietary discipline.",
  },
  {
    key: "mind",
    name: "MIND",
    description:
      "Clarity, focus, attention. Earned from reclaiming your attention and senses.",
  },
  {
    key: "emotion",
    name: "EMOTION",
    description:
      "Social courage and emotional regulation. Earned from exposure and reclaimed intimacy.",
  },
  {
    key: "energy",
    name: "ENERGY",
    description:
      "Raw vitality and stamina. Earned from stimulant control, diet, and compulsion resistance.",
  },
  {
    key: "spirit",
    name: "SPIRIT",
    description:
      "Depth, presence, inner silence. Earned from sensory reset and sustained discipline.",
  },
];

const RANKS = [
  { rank: "E", levels: "Lv 1–10" },
  { rank: "D", levels: "Lv 11–20" },
  { rank: "C", levels: "Lv 21–30" },
  { rank: "B", levels: "Lv 31–40" },
  { rank: "A", levels: "Lv 41–50" },
  { rank: "S", levels: "Lv 51–60" },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <article className="max-w-3xl mx-auto space-y-12">
        <header className="text-center border-b border-slate-800 pb-10">
          <p className="text-[10px] tracking-[0.5em] text-cyan-400/70 uppercase mb-4 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            [ The System Manual ]
          </p>
          <h1 className="font-display text-aberration text-3xl sm:text-4xl font-bold tracking-tight text-cyan-100 mb-4">
            Hunter Guide
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            The System doesn&apos;t hide its rules. Read them. Enter a dungeon.
            Begin.
          </p>
        </header>

        <Section title="1. How to Awaken">
          <p>
            First contact with the System is brief. You sign in. The System
            greets you as a hunter. You accept the gate. A hunter ID is written
            and your Portal Registry unlocks.
          </p>
          <p>
            From there, seven dungeons stand open. Pick one you&apos;d fight
            even without a scoreboard. The scoreboard is only there to remind
            you that you did.
          </p>
        </Section>

        <Section title="2. The Five Rule Types">
          <p className="mb-6">
            Every dungeon runs on one of five rule types. Read this once and
            the rest of the System collapses into something simple.
          </p>
          <div className="space-y-4">
            {RULE_TYPES.map((r) => (
              <div
                key={r.type}
                className="border border-slate-800 bg-slate-900/40 p-5 rounded"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <p className="font-display text-sm font-bold text-cyan-200 uppercase tracking-wider">
                    {RULE_LABEL[r.type]}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    {r.used_by}
                  </p>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {r.summary}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="3. The Seven Portals">
          <p className="mb-6">
            Each portal is a specific discipline with specific rules and
            specific dimensions it trains.
          </p>
          <div className="space-y-4">
            {DUNGEONS.map((d) => (
              <div
                key={d.id}
                className="border border-slate-800 bg-slate-900/40 p-5 rounded"
              >
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <p className="font-display text-base font-bold text-cyan-100">{d.name}</p>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-amber-400/80 px-2 py-0.5 border border-amber-400/30 rounded-sm">
                    {RULE_LABEL[d.ruleType]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {dungeonDims(d).map((dim) => (
                    <span
                      key={dim}
                      className={`text-[9px] font-bold uppercase tracking-[0.25em] px-1.5 py-0.5 border rounded-sm ${DIM_STYLE[dim]}`}
                    >
                      {dim}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {d.description}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. Hunter Ranks">
          <p className="mb-5">
            Six ranks. Each holds 10 levels. Sixty levels total to Shadow
            Monarch. XP required per level follows a 1.5-power curve — the
            higher you climb, the slower each level arrives.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {RANKS.map((r) => (
              <div
                key={r.rank}
                className="text-center bg-slate-900/40 border border-slate-800 rounded py-3"
              >
                <p className="text-xl font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                  {r.rank}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 tracking-wider uppercase">
                  {r.levels}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-400 leading-relaxed">
            XP drops from four places:
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-cyan-300 font-mono">
                  +{XP_PER_STREAK_DAY}
                </span>{" "}
                each time you check in a cleared day on a streak/timed dungeon
                — plus that dungeon&apos;s dimension points
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-cyan-300 font-mono">
                  +{XP_PER_WORKOUT}
                </span>{" "}
                per workout logged in Training Regimen
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-cyan-300 font-mono">
                  +{XP_PER_EXPOSURE}
                </span>{" "}
                per exposure logged in Exposure Therapy
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400/60 mt-0.5">▸</span>
              <span>
                <span className="text-amber-300 font-mono">
                  +{XP_PER_COMPLETION}
                </span>{" "}
                when you claim Victory on a timed dungeon
              </span>
            </li>
          </ul>
        </Section>

        <Section title="5. The Five Dimensions">
          <p className="mb-6">
            Progress is tracked across five dimensions, not one flat XP bar.
            Each dungeon trains a specific subset. Your profile shows a radar
            chart — balanced hunters see a pentagon; specialized hunters see a
            spike.
          </p>
          <div className="space-y-4">
            {DIMENSIONS.map((d) => (
              <div
                key={d.key}
                className="flex items-start gap-4 border border-slate-800 bg-slate-900/40 p-5 rounded"
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.3em] px-2 py-1 border rounded-sm shrink-0 self-start ${DIM_STYLE[d.key]}`}
                >
                  {d.name}
                </span>
                <p className="text-sm text-slate-400 leading-relaxed flex-1">
                  {d.description}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="6. Daily Quests & the Combo System">
          <p>
            Each day the System offers a rotating set of small quests — each
            tied to a dimension. Complete them to earn dimension points and
            XP.
          </p>
          <p className="mt-3">
            Complete <span className="text-cyan-300 font-bold">{COMBO_THRESHOLD}</span>{" "}
            or more quests in a single day and that day qualifies for your
            combo. Consecutive qualifying days build a combo streak. At each
            milestone, bonus XP lands as a toast on your Status Window:
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMBO_MILESTONES.map((m) => (
              <div
                key={m.days}
                className="text-center bg-slate-900/40 border border-amber-400/20 rounded py-3"
              >
                <p className="text-lg font-bold text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
                  {m.days}d
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  +{m.xp} XP
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-500 leading-relaxed">
            A 1-quest or 2-quest day is a grace day — you won&apos;t build, but
            you won&apos;t break either. Only a full miss resets the combo.
          </p>
        </Section>

        <Section title="7. The Scattered Debuff">
          <p>
            Complete zero quests in a day, and tomorrow you wake up{" "}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-red-500/50 bg-red-500/10 text-[10px] text-red-300 tracking-[0.2em] uppercase rounded-sm align-middle">
              <span aria-hidden>⚠</span> Scattered
            </span>{" "}
            — a visible mark on your Hunter Card.
          </p>
          <p className="mt-3">
            Scattered is not a punishment. It costs no XP. It reveals nothing
            to other hunters. It&apos;s a mirror. You were absent, and the
            System shows you that fact until you&apos;re back.
          </p>
          <p className="mt-3">
            It clears the moment you complete your first quest of the new day.
          </p>
        </Section>

        <Section title="8. The Social Layer">
          <p>
            Other hunters exist. The System lets you cross paths.
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">Public Profile.</span>{" "}
            Every hunter has a read-only profile at{" "}
            <span className="font-mono text-cyan-300">/h/&lt;id&gt;</span> —
            rank, level, active dungeons, dimensions, trophies. Other
            signed-in hunters with your link can view it (not exposed to the
            open internet). Find your share link on your{" "}
            <Link href="/profile" className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2">/profile</Link>{" "}
            page.
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">Friends.</span> Visit
            another hunter&apos;s profile and tap{" "}
            <span className="text-cyan-300 font-mono">+ Add Friend</span>.
            They&apos;ll get a notification, accept, and you both appear on
            each other&apos;s friends list. Friendship is the foundation —
            group hunts and leaderboards build on top of it later.
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">Journal Entries.</span>{" "}
            When you relapse, log a coffee, complete a run, or just want to
            write — a small note modal lets you save a reflection. Default
            is private (only you see it on your profile). Tick{" "}
            <span className="font-mono text-cyan-300">Share to public profile</span>{" "}
            to surface that one entry on your public profile under
            Reflections.
          </p>
        </Section>

        <Section title="9. Reach & Reliability">
          <p>
            <span className="text-cyan-300 font-bold">Daily Reminders.</span>{" "}
            On your profile, flip on the Daily Reminder toggle. The System
            sends a morning push if your day went unused yesterday and an
            evening push if today is slipping away. The message is
            state-aware — relapsed yesterday gets a comeback nudge, fell
            behind gets a pattern-break, on track gets a keep-going reset.
          </p>
          <p className="mt-3">
            On iPhone, push only works if you&apos;ve installed the app to
            your home screen via Safari&apos;s{" "}
            <span className="text-cyan-300 font-mono">Share → Add to Home Screen</span>{" "}
            (iOS 16.4+). On Android Chrome, just installing the PWA is
            enough.
          </p>
          <p className="mt-3">
            <span className="text-cyan-300 font-bold">Offline.</span> The app
            works without a connection. On a plane, in the subway, in
            bad-signal zones — complete quests, log relapses, write journal
            entries. Everything queues locally and drains to the server the
            moment you reconnect. An amber banner shows when you&apos;re
            offline and how many actions are waiting to sync.
          </p>
        </Section>

        <Section title="10. Currently Free">
          <p>
            Every feature is currently free — every dungeon, every
            achievement, daily quests, dimensions, the heatmap, friends,
            journal, push, unlimited active runs.
          </p>
          <p className="mt-3">
            If paid tiers ever exist, core self-hunting stays free.
            Competition with yourself shouldn&apos;t have a paywall. Early
            hunters get remembered.
          </p>
        </Section>

        <div className="pt-10 text-center border-t border-slate-800">
          <p className="text-sm text-slate-300 mb-6 tracking-widest">
            The quest remains open.
          </p>
          <Link
            href="/portals"
            className="inline-block px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            Enter the Portal Registry →
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg sm:text-xl font-bold text-cyan-200 uppercase tracking-wider mb-4">
        {title}
      </h2>
      <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}