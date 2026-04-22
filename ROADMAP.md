# SHIVALIVA LEVELING — Post-Launch Roadmap

**Drafted:** 2026-04-21
**Launch target:** 2026-04-30
**Rule #1:** Retention beats features. Every item below earns its slot by pulling a retention or revenue lever, not by sounding cool.

---

## Freeze Phase — Now → Launch (Apr 30)

**Build nothing new.** This is locked. The portals, dungeons, achievements, dimensions, profile, awakening — all done.

Allowed:
- Copy tweaks, bug fixes, polish
- Landing page, privacy, terms, OG, favicon
- Analytics + retention hooks (PostHog, Resend)
- Monetization plumbing (Polar.sh, paywall component)
- Launch content (screenshots, posts, ProductHunt draft)

Not allowed:
- New portals
- New achievement categories
- New dimensions
- New dungeon rule types
- Community, feed, leaderboard, profiles-of-others, pods, custom dungeons — **none of it**

If you catch yourself coding a feature, close the file. Go write a launch post.

---

## Month 1 — May 2026: Validate Retention, Build Light Social

**Goal:** see whether Day 7 and Day 30 retention is real. Add the *minimum* social surface that lets users see each other without opening a feed firehose.

### Ship
- **Public hunter profiles** (`/hunter/[username]`) — shows their level, rank, dimensions radar, trophies cabinet, active dungeons *(but not per-event journal yet)*. Read-only.
- **Weekly leaderboard** — ranked by **XP gained this week**, not lifetime. Lifetime leaderboards punish new users; weekly gives everyone a fresh shot. Top 100 only.
- **VIP cosmetic frame** — Pro subscribers get an animated border on their Hunter Card + a "VIP" badge. Purely cosmetic, zero gameplay impact.
- **Streak Insurance** — 1 per month, Pro-only. Lets you survive 1 relapse without resetting streak. Huge emotional retention lever for NoFap / Sensible Diet / Music dungeons.
- **Whole-app theme system (Pro)** — theme selector swaps ~6 CSS custom properties at `:root`, restyling every surface (landing, dashboard, dungeons, profile, toasts). Launch themes:
  - **Default — Cyan System** (free, current)
  - **Shadow Monarch** (violet/obsidian) — Pro
  - **S-Rank Ascendant** (amber/gold) — Pro
  - **Blood Red Gate** (crimson/black) — Pro
  - **Verdant Dungeon** (emerald/forest) — Pro
  - Budget: ~3–4 h per theme for design + QA × 4 premium themes = ~14 h. May spill into early Month 2 if VIP frame + Streak Insurance crowd the sprint.

### Measure
- Day 7 retention on the Apr 30 cohort
- Paywall hit rate, Free → Pro conversion
- Does "view another hunter" exist as a behavior? (If people don't click profiles, don't build the feed in Month 3.)

### Do not build
- Public feed / posts — Month 4 at earliest
- Accountability pods — Month 2
- Friend system with DMs — probably never

---

## Month 2 — June 2026: Accountability Pods

**Goal:** small-group retention. The single biggest retention lever for habit apps is a peer group that notices when you stop showing up.

### Ship
- **Accountability Pods** — private groups of 2–10 users. Create via invite link. Inside a pod: see each other's active dungeons, streaks, weekly check-ins. *No public feed, no strangers.* Pro feature (one member needs Pro to create; joiners can be free).
- **Per-run journal** — on *your own* profile, add optional text notes to dungeon events ("Day 7, rough day at work, held the streak"). Private by default; toggle to share to your pod.
- **Pod weekly digest email** — "Here's how your pod did this week."

### Measure
- Do pods retain better than solo users at Day 30? (Expected answer: yes, by a lot.)
- Average pod size settling point
- Pod creator → paid conversion rate

### Do not build
- Public social feed
- Pod discovery / matchmaking (people should bring their own friends)
- Video or voice inside pods (you are one person)

---

## Month 3 — July 2026: Custom Dungeons + Referrals

**Goal:** give power users a reason to stay past 60 days, and turn them into growth.

### Ship
- **Custom dungeons** (Pro) — user defines name, rule type (pick from existing 5 types), dimension mapping, tiers. Does NOT generate new achievements; custom dungeons stay outside the trophy system.
- **Referral mechanic** — each user gets a referral link. Friend signs up and completes Awakening = referrer gets 1 free month of Pro (or 1 free Streak Insurance if already Pro).

### Measure
- What % of Pro users create a custom dungeon? If < 20%, it was vanity and don't expand it.
- Referral conversion rate

### Do not build
- Marketplace for custom dungeons (nightmare moderation, do not touch)
- Custom achievements
- Custom dimensions

---

## Month 4+ — August 2026 and beyond: Conditional Features

**Only build these if retention / revenue signals from Months 1–3 demand them.**

### Candidates (not commitments)
- **Public milestone feed** — opt-in only, "I cleared NoFap A-rank" style posts with zero comments at first. A feed without comments is safer than a feed with them.
- **Native app wrappers** — Capacitor or Tauri for Play Store / App Store presence. Only after MRR > $500/month justifies the $99/year Apple dev fee and ongoing hassle.
- **Weekly email journal digest** — "Here's what your last 7 days looked like" with radar delta + streak summary.
- **Community Discord** — 1 channel, invite-only for Pro users, only if retention shows people *want* to talk to each other (Month 2 pods will tell you this).

### Explicitly deferred indefinitely
- DMs between strangers
- Follower/following graph
- Comments on other users' milestones
- Ads (you're selling Pro; ads eat the same revenue attention)
- AI coach / chatbot features
- Android/iOS native app before PWA retention proves out

---

## Monetization — Locked Positions

### What Pro unlocks
1. **Unlimited active dungeons** (free = 2 active at once)
2. **VIP cosmetic frame** + badge
3. **Streak Insurance** (1 per month)
4. **Lifetime analytics** — full heatmap history, dimension history charts, export data
5. **Accountability Pods** (creator must be Pro; joiners free)
6. **Custom dungeons** (Month 3+)
7. **Whole-app themes** — Shadow Monarch, S-Rank Ascendant, Blood Red Gate, Verdant Dungeon

### What Pro does NOT paywall
- **Exposure Therapy dungeon.** Hard no. The dungeon for socially isolated, lonely people is the last thing you lock behind a paycheck. This is an ethical line — don't cross it even for revenue.
- All 7 base portals
- All 64 achievements
- Daily quests
- Dimensions radar
- 8-week activity heatmap

### Pricing (locked, do not re-litigate)
- $4.99 / month
- $39 / lifetime (heavy UI bias toward this)
- 7-day trial on Pro, card required

### Merchant of Record
- **Polar.sh** or **LemonSqueezy** — NOT raw Stripe. UAE sellers can't solo EU VAT. ~5% fee buys you global tax compliance.

---

## The "Do Not Build" List

Keep this visible. When the temptation hits, re-read it.

- ❌ New portals before Month 6 (7 is the right number for now)
- ❌ Public social feed before retention data proves demand
- ❌ DMs between strangers (ever)
- ❌ Ads
- ❌ AI coach / LLM feature (the app already works without it)
- ❌ Gamification redesigns (level curve, XP formula, rank ladder — locked)
- ❌ Stat system redesign (5 dimensions locked: BODY / MIND / EMOTION / ENERGY / SPIRIT)
- ❌ Custom achievements
- ❌ Marketplace / user-generated content you'd have to moderate
- ❌ Native app before PWA retention hits 30% at Day 30
- ❌ Quitting the day job before MRR > 2× salary for 3 consecutive months

---

## Decision Rules

When you're tempted to break the roadmap:

1. **"Will this move Day 7 retention by >5%?"** If you can't answer yes with a straight face, don't build it.
2. **"Is this a retention lever or a toy?"** Toys feel fun to build and don't ship revenue.
3. **"Can I ship it in 2 weekends?"** If no, it's probably too big for your current bandwidth. Cut scope or defer.
4. **"Does this violate a 'Do Not Build' line?"** If yes, stop and reread why it's on the list.

---

## What Changes First If Launch Flops

If Day 30 retention is <10%, roadmap pauses. Order of triage:

1. Watch onboarding funnel (Awakening → first dungeon started). If drop-off > 50%, rewrite Awakening copy before anything else.
2. Look at which dungeon people *actually start* and which gets abandoned first. Kill or redesign the abandoned one.
3. Check if users return after first relapse. If not — Streak Insurance ships in Month 1 as emergency retention patch, not as Pro gate.
4. Only after retention stabilizes do Month 2+ features get built.

Retention is a math problem, not a feature problem. Fix the math first.

---

— Claude