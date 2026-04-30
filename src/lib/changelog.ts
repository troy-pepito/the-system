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
        text: "Emoji reactions on feed entries — 🔥 💪 🙏 ❤️ ✨. Tap to react, tap again to take it back.",
      },
      {
        kind: "feature",
        text: "Settings has its own page now, with a gear icon in the navbar's top-right. Notifications, Atmosphere, Install, and Language all live there.",
      },
      {
        kind: "feature",
        text: "Language picker — English and Spanish to start. More landing as translations come in.",
      },
      {
        kind: "feature",
        text: "Caffeine Reboot + Diet Challenge moved to the daily check-in calendar. Same pattern as NoFap — Cleared / Relapsed each day, Exit Dungeon when you're done.",
      },
      {
        kind: "feature",
        text: "Tier crossings now celebrate. When you cross E → D → C → B → A → S in a dungeon, a 🏆 toast lands with a one-time XP bonus (100 → 3200 cumulative).",
      },
      {
        kind: "feature",
        text: "XP scales with your highest tier in each dungeon — the deeper you go, the more every cleared day, workout, and exposure pays out (capped at +30/action at S).",
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
        text: "Edit any journal entry from the profile or the journal page — text and public/private flag both update.",
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
        text: "Per-dungeon Outstanding push — the morning notification now names which dungeons you haven't checked into today.",
      },
      {
        kind: "feature",
        text: "Wisdom-quote pool grew to 112 — matching Shiva's 112 methods of meditation. Sadhguru, Osho, Bhagavad Gita, Stoics, and more.",
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
        text: "New Side Quest system — rare, date-conditional quests with bonus XP + dimensions.",
      },
      {
        kind: "feature",
        text: "First side quest: Ekadashi Fast. Astronomically auto-detected from lunar tithi, aligned with Sadhguru's calendar. Push notification fires on Ekadashi mornings.",
      },
      {
        kind: "feature",
        text: "Recent Gains feed on the profile — see your last 10 XP/dimension drops with source and timestamp.",
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
        text: "Cleared days bank XP + dimensions permanently — relapses are markers, not run-enders.",
      },
      {
        kind: "feature",
        text: "Multi-relapse counting per day. Run only ends when you tap Exit Dungeon.",
      },
    ],
  },
];

/** Latest release — newest entry in the log. */
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
