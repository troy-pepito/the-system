# Play Store Submission Checklist

End-to-end guide for shipping Shivaliva Leveling to the Google Play Store
as a Trusted Web Activity (TWA). The PWA at https://shivalivaleveling.com
is the source of truth — the TWA is a thin Android shell that points at it.

---

## Status of the codebase prep

Already in place (no action needed):
- ✅ Manifest at `/manifest.webmanifest` with stable id, icons (incl.
  maskable), theme color, display mode.
- ✅ Maskable-safe 512×512 icon at `/icon1` (icon1.tsx). Adaptive Android
  icons crop up to 20% off each side; the inner safe zone holds the cyan
  ring + S character so the icon survives circle / squircle / teardrop.
- ✅ HTTPS via Vercel + Let's Encrypt.
- ✅ Service worker registered, offline support working, push wired up.
- ✅ Privacy policy at `/privacy` covering Play Store data-disclosure
  expectations (collection, purpose, sharing, retention, user rights,
  age 16+, security, change policy).
- ✅ Terms at `/terms`.
- ✅ OG image at `/opengraph-image` for social previews.
- ✅ Asset Links route handler at `/.well-known/assetlinks.json` —
  needs SHA-256 fingerprints filled in (see TWA Build below).

---

## Open prep tasks

### 1. Account deletion in-app
Play Store policy requires apps that let users create an account to
also let them **delete** that account from inside the app, not just via
email. Privacy section 6 lists the email path as the legal minimum;
Google wants a button.

Minimum viable: a "Delete Account" button under `/settings` that calls
a `deleteAccount` server action. The action must:
- Soft-delete or hard-delete the Clerk user (use `clerkClient().users.deleteUser`)
- Cascade to the local DB: DungeonRun (cascades to events + checkIns),
  QuestCompletion, Achievement, Friendship rows, GuildMember rows,
  EmailSent, PushSubscription. Most have `userId: String` so a single
  transaction with `deleteMany({ where: { userId } })` per table works.
- Sign the user out and redirect to the landing page.

Add a confirm flow (the unfriend / disband 2-tap pattern works).

### 2. Bubblewrap TWA build
Bubblewrap is Google's CLI for generating a TWA from a PWA manifest.

```bash
# One-time install (Java 11+ required)
npm install -g @bubblewrap/cli

# Initialize from the manifest. Run this from a fresh dir, not inside
# the website repo — Bubblewrap creates a separate Android project.
bubblewrap init --manifest=https://shivalivaleveling.com/manifest.webmanifest

# Bubblewrap prompts for: package name, app name, host, signing key
# details. Suggested values:
#   Package name:    com.shivaliva.leveling
#   App name:        Shivaliva Leveling
#   Launcher name:   The System
#   Display mode:    standalone
#   Theme color:     #22d3ee
#   Background:      #020617

# Build the signed APK + AAB
bubblewrap build

# Output: app-release-bundle.aab (this is what you upload to Play)

# Get the SHA-256 fingerprint of your local debug keystore
bubblewrap fingerprint
```

After `bubblewrap init`, paste the SHA-256 fingerprint into
`SHA256_FINGERPRINTS` in `src/app/.well-known/assetlinks.json/route.ts`.
Deploy. Verify by visiting `https://shivalivaleveling.com/.well-known/assetlinks.json`
and confirming the JSON renders with your fingerprint.

The `package_name` in that route must match exactly what you set in
Bubblewrap (currently `com.shivaliva.leveling`). If you change it,
update both places.

### 3. Play Console setup
- $25 one-time Google Play Developer registration fee.
- Create app in Play Console.
- Connect the Bubblewrap-built `.aab` as your initial build.
- After Google issues their **App Signing Key**, copy that SHA-256
  fingerprint from Play Console → Setup → App Integrity, append it
  to `SHA256_FINGERPRINTS`, deploy. Both fingerprints (debug + Play)
  can coexist in the array.

---

## Store listing copy

### Short description (80 characters max)

> Face your shadows. Rank up in real life. A gamified self-improvement system.

(76 chars)

Alternates if you want to test:
- "The compulsions nobody's watching, ranked E to S. Solo Leveling for life." (74)
- "Gamified self-improvement for the battles nobody else sees." (60)

### Long description (4000 characters max)

```
Shivaliva Leveling is a gamified self-improvement system for the battles nobody's watching.

Pick your dungeons — NoFap, no doomscroll, training regimen, exposure therapy, diet, sensory reset. Show up daily. Earn XP. Climb ranks E → D → C → B → A → S over months and years of consistent play.

This isn't a habit tracker. It's a system you accept.

✦ FIVE DUNGEONS
Pick the habits you're actually fighting:
• NoFap — daily check-ins, banked progress
• Doomscroll Detox — calendar of cleared days
• Training Regimen — log workouts, hit weekly cadence
• Exposure Therapy — climb a 6-rung ladder from "Presence" to "Expose"
• Diet Challenge — daily discipline, calendar tracking

✦ DAILY QUESTS
Seven small morning routines: cold shower, journaling, breathwork, no sugar, etc. Tick them off. Build a daily combo. Hit Perfect Days for bonus XP.

✦ HUNTER PATHS
Body. Mind. Emotion. Energy. Spirit. Pick the dimension you want to develop and unlock a starter dungeon tuned to that path.

✦ GUILDS
Form a small band of up to 10 hunters. Members' public reflections land in your guild's feed — small intimate accountability circles, not anonymous broadcast. Owners approve who joins.

✦ WEEKLY LEADERBOARD
Every action this week earns activity points: 1pt for daily quests, 2pt for workouts, 3pt for exposures and perfect days. Compete globally, with friends, inside your guild, or guild-vs-guild. Resets every 7 days.

✦ TROPHIES
Unlock achievements as you climb. Claim them for bonus XP. Common to legendary rarity tiers.

✦ DESIGNED FOR THE WORST DAY
Dungeons are sized to be doable when you're depleted. Every action banks. Relapses are markers, not run-enders. The system rewards showing up, not perfection.

✦ OFFLINE-FIRST
Works without a connection. Plane mode, subway, bad signal — log everything. Syncs when you reconnect.

✦ PRIVATE BY DEFAULT
Your journal is private. Toggle individual entries to public if you want them in your guild feed or on your hunter profile. No public broadcast feed.

Free to play. No ads. No paywalls on the core hunting loop.
```

(~1900 chars — leaves headroom)

### Feature graphic (1024×500)

Reuse the OG image style. Could be auto-generated by a Next.js
`feature-graphic.tsx` route similar to `opengraph-image.tsx` but at
1024×500 — let me know if you want that scaffolded.

For manual: dark slate background, centered "FACE YOUR SHADOWS / RANK
UP IN REAL LIFE" headline in cyan + amber accents, E→D→C→B→A→S ladder.

### Screenshots (8 phone, 16:9 or 9:16)

Capture these surfaces on your phone after install:
1. **Awakening intro** — typing animation mid-line
2. **Status page** — at least one active dungeon card with a streak going
3. **Daily Quests** — some ticked, some not, combo counter visible
4. **Hunter Card on Profile** — name, rank, level, dimensions radar
5. **Trophies** — at least one trophy unlocked, one unclaimed (amber pulse)
6. **Leaderboard / Global tab** — populated rows
7. **Guild detail** — member list with weekly points
8. **Hunter Path** — picker with one path active

Resolution: at least 1080 wide (Pixel 7, iPhone 13 size). Vertical works
better for an app that's primarily mobile.

### Categorization
- Category: **Health & Fitness** (or **Lifestyle**; both work, Health
  & Fitness ranks more discoverable for self-improvement queries)
- Tags: self-improvement, habit tracker, productivity, gamification,
  discipline, addiction recovery
- Content rating: **Teen** likely (mentions of addiction, exposure
  therapy framing). Run the Play Console questionnaire honestly — the
  presence of NoFap-adjacent tracking will land you in Teen, not
  Everyone.

---

## Pre-submission verification

Before hitting submit:

```bash
# Lighthouse PWA audit — should score 90+ across all categories
npx lighthouse https://shivalivaleveling.com --view

# Asset Links file is reachable
curl https://shivalivaleveling.com/.well-known/assetlinks.json

# Manifest is reachable
curl https://shivalivaleveling.com/manifest.webmanifest

# Verify the assetlinks fingerprint matches what Bubblewrap signed
# — `bubblewrap validate` checks this automatically
bubblewrap validate
```

---

## After submission

- First review: 1–3 business days typically
- If rejected: most common reasons are missing privacy disclosures,
  account deletion not in-app, or signing fingerprint mismatch
- Once published, every update goes through review (faster, ~hours,
  but still a delay vs. PWA push)
- Add the Play store listing URL to your website footer + landing
  page CTA so PWA visitors can install the native app

## Open product question (post-launch)

Per project memory (`project_pricing_strategy.md`): Play Store doesn't
change the pricing strategy. App stays free. If/when paid tiers
activate (~500 users + Day 7 retention data), Google Play Billing
integration is required for any in-app purchases — the existing Polar
checkout flow won't satisfy Play Store policy for digital goods. That's
a separate workstream for when pricing actually flips on.
