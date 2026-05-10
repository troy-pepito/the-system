/**
 * Hand-curated release log. Add a new entry at the top when you deploy
 * something user-facing. The entry's `version` becomes the new "latest"
 * and players who haven't seen it get a NEW badge on the navbar.
 *
 * Tone: short, direct, player-facing prose. Not commit messages.
 *
 * Bump version when shipping. Suggested SemVer-ish:
 *   - patch (x.x.X) → bug fixes only
 *   - minor (x.X.0) → new features, additive changes
 *   - major (X.0.0) → big feature drops or behavioral shifts
 */

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: ChangelogChange[];
}

export interface ChangelogChange {
  /** Visual category for the bullet's badge color/icon. */
  kind: "feature" | "fix" | "polish";
  text: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.0.0",
    date: "2026-05-09",
    title: "Guilds + Leaderboards",
    changes: [
      {
        kind: "feature",
        text: "Guilds: form a band of up to 50 hunters, request-and-approve to join, with each guild on its own /g/{slug} page. Owners can edit, kick, transfer ownership, or disband, all from a single Manage Guild panel.",
      },
      {
        kind: "feature",
        text: "Guild Feed: members' public journal entries land in a guild-scoped timeline, separate from the rest of the system. Your hunters see what your hunters are doing, and only them.",
      },
      {
        kind: "feature",
        text: "Weekly Leaderboard at /leaderboard with four scopes: Global, Friends, Guild, Guilds. Ranked by activity points: 1pt for a daily quest or cleared day, 2pt for a workout or side quest, 3pt for an exposure or perfect day. Resets every 7 days. Your rank shows even when you're outside the top 50.",
      },
      {
        kind: "feature",
        text: "Cross-guild competition: guilds race each other on total weekly points, with per-member average displayed so small-but-active guilds aren't drowned out.",
      },
      {
        kind: "feature",
        text: "Reorder dungeons on the Status page, long-press the grip icon on any card and drag it where you want. Order syncs across devices via your hunter profile.",
      },
      {
        kind: "feature",
        text: "Mastered ladders are now undoable. Cleared the final rung by accident? Tap Undo from the Mastered state instead of being locked out, claim Victory only when you mean it.",
      },
      {
        kind: "fix",
        text: "Achievements re-lock when the underlying action is undone. Untick a quest, walk back an exposure, the trophies that hinged on it disappear with it (combo milestones stay, since those mark a streak that genuinely happened).",
      },
      {
        kind: "polish",
        text: "Significant toasts (achievement unlock, Reflection Recorded, big celebrations) no longer auto-fade. Tap the X to dismiss, or follow the link, they wait for you.",
      },
      {
        kind: "polish",
        text: "Achievement toast taps now scroll you to the actual trophy on your profile and auto-expand its section, instead of dropping you at the top of the page.",
      },
      {
        kind: "polish",
        text: "Profile trophy sections show an amber count badge for unclaimed trophies, so you can find pending claims without opening every panel.",
      },
      {
        kind: "polish",
        text: "Note modal can be cancelled via X / click-outside / ESC, separate from \"Skip Note\" (which still means log without writing).",
      },
      {
        kind: "polish",
        text: "Navbar redesigned with icons + labels. Hunter's Path moved out of Settings to its own /path page, accessible from /portals.",
      },
      {
        kind: "polish",
        text: "Permanent \"+ Enter Another Dungeon\" CTA at the bottom of the Status page when you have active runs, Portals link removed from the navbar to declutter.",
      },
      {
        kind: "polish",
        text: "Global Feed retired. Public journal entries from guild members surface in their guild's feed; otherwise they live on each hunter's public profile (/h/{hunterId}). Community is intimate now, small bands, not anonymous broadcast.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-08",
    title: "Production",
    changes: [
      {
        kind: "feature",
        text: "Shivaliva Leveling is live at its official domain: shivalivaleveling.com. The system is real now.",
      },
      {
        kind: "feature",
        text: "Report a Bug button in the footer. Stuck or seeing something off? Send a note straight from the app, your hunter ID and current page get attached automatically.",
      },
      {
        kind: "feature",
        text: "Hunter Card redesign: kebab menu groups Rename / Share / View Public / View Ranks, the Scattered badge sits under your portrait, and a new Badges row shows your dominant dimension as a Hunter title.",
      },
      {
        kind: "feature",
        text: "Achievement unlock toasts are now tappable, open your profile to see the trophy you just earned.",
      },
      {
        kind: "feature",
        text: "Public profiles get a small friend-action icon next to the kebab dots in the Hunter ID header, sleeker than the old pill button under the card.",
      },
      {
        kind: "fix",
        text: "Awakening: choosing your Hunter Path actually works now. The flow was silently skipping the path picker for new sign-ins.",
      },
      {
        kind: "fix",
        text: "Streaks and dungeons no longer mysteriously reset. Old offline mutations could clobber relapse marks or resurrect ended dungeons, both are now structurally impossible.",
      },
      {
        kind: "fix",
        text: "Perfect Day (+30 XP) and Cadence Full Clear (+20 XP) bonuses persist across refreshes. They used to flash a level-up then vanish on the next page load.",
      },
      {
        kind: "polish",
        text: "Cross-tab sync: actions on one tab update other open tabs within a second. Long-idle tabs auto-refresh every minute, no manual reload required.",
      },
      {
        kind: "polish",
        text: "Trophy names wrap onto two lines on small screens instead of getting cut off with an ellipsis.",
      },
      {
        kind: "polish",
        text: "Service Worker bumps its cache key on every deploy, so users always get the latest JS without hitting refresh.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-05-01",
    title: "Hunter Path",
    changes: [
      {
        kind: "feature",
        text: "Pick a Hunter Path in Settings: Body, Mind, Emotion, Energy, or Spirit. Each path mirrors one of the five dimensions and unlocks its own daily routine.",
      },
      {
        kind: "feature",
        text: "Five new Daily dungeons, one per path: Daily Forge (Body), Daily Sharpening (Mind), Daily Bonds (Emotion), Daily Spark (Energy), Daily Stillness (Spirit). Three small tasks each, clear any one to bank the day.",
      },
      {
        kind: "feature",
        text: "Daily Forge ramps with your rank, pushups, pullups, and squats grow tier-by-tier from 5/1/10 at the start to 100/40/150 at S.",
      },
      {
        kind: "feature",
        text: "Your Hunter Path now shows as a badge under your name, on your own card and on public profiles.",
      },
      {
        kind: "feature",
        text: "Path-locked dungeons in /portals show \"🔒 Path Required\" with a link to Settings, so you can see what each path unlocks before committing.",
      },
      {
        kind: "fix",
        text: "Heatmap now includes cleared calendar check-ins. Hunters whose activity was mostly NoFap / Doomscroll / Sound Sensitization had a permanently empty heatmap before.",
      },
      {
        kind: "fix",
        text: "Cadence task ticks now drop their dimension reward in the gain toast, only XP showed before.",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-04-30",
    title: "The Feed + Settings + Languages",
    changes: [
      {
        kind: "feature",
        text: "New /feed: see public reflections from every hunter across the system. Tap a name to open their profile.",
      },
      {
        kind: "feature",
        text: "Emoji reactions on feed entries, 🔥 💪 🙏 ❤️ ✨. Tap to react, tap again to take it back.",
      },
      {
        kind: "feature",
        text: "Settings has its own page now, with a gear icon in the navbar's top-right. Notifications, Atmosphere, Install, and Language all live there.",
      },
      {
        kind: "feature",
        text: "Language picker, English and Spanish to start. More landing as translations come in.",
      },
      {
        kind: "feature",
        text: "Caffeine Reboot + Diet Challenge moved to the daily check-in calendar. Same pattern as NoFap, Cleared / Relapsed each day, Exit Dungeon when you're done.",
      },
      {
        kind: "feature",
        text: "Tier crossings now celebrate. When you cross E → D → C → B → A → S in a dungeon, a 🏆 toast lands with a one-time XP bonus (100 → 3200 cumulative).",
      },
      {
        kind: "feature",
        text: "XP scales with your highest tier in each dungeon, the deeper you go, the more every cleared day, workout, and exposure pays out (capped at +30/action at S).",
      },
      {
        kind: "fix",
        text: "Exit Dungeon no longer mistakenly grants the +500 Victory bonus. Only Claim Victory (after hitting a timed dungeon's target) does.",
      },
      {
        kind: "fix",
        text: "Calendar history now persists across exit/re-enter. Re-entering a dungeon shows your full prior streak instead of resetting to zero.",
      },
      {
        kind: "polish",
        text: "Calendar pops in instantly from cache. No more waiting for the server fetch to settle before it renders.",
      },
      {
        kind: "polish",
        text: "Saving a journal entry now fires a [Reflection Recorded] notice with a link straight to your journal archive.",
      },
      {
        kind: "polish",
        text: "Hash-link navigation (Portals → / #dungeon-X) now centers the card in the viewport instead of pushing it below the fold.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-04-30",
    title: "Journal Page + Edit/Delete",
    changes: [
      {
        kind: "feature",
        text: "Journal entries now live on their own /journal page, with the latest 5 previewed on your profile.",
      },
      {
        kind: "feature",
        text: "Edit any journal entry from the profile or the journal page, text and public/private flag both update.",
      },
      {
        kind: "feature",
        text: "Delete journal entries with an inline confirm.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-04-29",
    title: "Reach + Reliability",
    changes: [
      {
        kind: "feature",
        text: "Install App button on Profile → Settings, with a smaller version in the landing-page footer.",
      },
      {
        kind: "feature",
        text: "Per-dungeon Outstanding push, the morning notification now names which dungeons you haven't checked into today.",
      },
      {
        kind: "feature",
        text: "Wisdom-quote pool grew to 112, matching Shiva's 112 methods of meditation. Sadhguru, Osho, Bhagavad Gita, Stoics, and more.",
      },
      {
        kind: "polish",
        text: "Skip-to-content link for keyboard / screen-reader users.",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-04-28",
    title: "Ekadashi Side Quest",
    changes: [
      {
        kind: "feature",
        text: "New Side Quest system, rare, date-conditional quests with bonus XP + dimensions.",
      },
      {
        kind: "feature",
        text: "First side quest: Ekadashi Fast. Astronomically auto-detected from lunar tithi, aligned with Sadhguru's calendar. Push notification fires on Ekadashi mornings.",
      },
      {
        kind: "feature",
        text: "Recent Gains feed on the profile, see your last 10 XP/dimension drops with source and timestamp.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-04-27",
    title: "Daily Check-In Calendar",
    changes: [
      {
        kind: "feature",
        text: "NoFap / No Doomscroll / Sound Sensitization now use a calendar where you check in each day as Cleared or Relapsed.",
      },
      {
        kind: "feature",
        text: "Cleared days bank XP + dimensions permanently, relapses are markers, not run-enders.",
      },
      {
        kind: "feature",
        text: "Multi-relapse counting per day. Run only ends when you tap Exit Dungeon.",
      },
    ],
  },
];

/** Latest release, newest entry in the log. */
export const LATEST_VERSION = CHANGELOG[0]?.version ?? "0.0.0";

const SEEN_KEY = "system:changelog-seen";

export function getLastSeenVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markVersionSeen(version: string = LATEST_VERSION): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, version);
    window.dispatchEvent(new Event(CHANGELOG_EVENT));
  } catch {}
}

export const CHANGELOG_EVENT = "system:changelog-seen-changed";

/**
 * True when the user's last-seen version doesn't match the latest. New
 * users see the badge once on first load, click to read the log, dismiss.
 */
export function hasUnseenRelease(): boolean {
  return getLastSeenVersion() !== LATEST_VERSION;
}
