# THE SYSTEM — 9-Day Launch Plan

**Drafted:** 2026-04-21 (Day 0 — sick in bed, vacation start)
**Target public launch:** 2026-04-30 (Thursday — back at work Apr 28, launch from evenings)

---

## Reality Check (read this first)

You will not have meaningful passive income in 9 days. Nobody does. What you CAN realistically achieve:

- ✅ Launch publicly with a real domain + landing page
- ✅ Get 100–2000 real users from targeted marketing
- ✅ Paywall infrastructure live (Stripe/Polar)
- ✅ First $10–$200 in sales (if conversion is decent)
- ❌ "Quit my job" income (that's 6–18 months of compounding)
- ❌ App Store release (Apple review + Developer account verification won't fit)
- ⚠️  Google Play — **possible** if you push Day 3–4, but the PWA launch is the priority

**The 9 days are about starting the flywheel, not reaching escape velocity.**

Retention > signups. If people come back on Day 7, you have a business. If they don't, no marketing budget saves you.

---

## The 9 Days

All achievable from bed (days 1–6) or after work (days 7–9). Prioritized by leverage, not by feel-good busywork.

**Cadence at a glance:**
| Day | Date | Day-of-week | Phase |
|---|---|---|---|
| 1 | Apr 22 | Wed | Polish + Domain |
| 2 | Apr 23 | Thu | Analytics + Retention |
| 3 | Apr 24 | Fri | Monetization |
| 4 | Apr 25 | Sat | Launch content prep |
| 5 | Apr 26 | Sun | Polish buffer + smoke test |
| 6 | Apr 27 | Mon | Dry run (original target — now buffer) |
| 7 | Apr 28 | Tue | **Back to work.** Rest in evening. |
| 8 | Apr 29 | Wed | Queue posts, final checks (evening) |
| 9 | Apr 30 | Thu | 🚀 **LAUNCH BLITZ** |
| 10 | May 1 | Fri | React + rest |

### Day 1 (Apr 22) — Polish + URL

- [ ] **Lock in your launch URL.** You're broke until May 4 salary — that's fine. Launch on the free Vercel subdomain (`the-system.vercel.app` or rename the project to something catchier in Vercel settings first). Custom domain migration is a 15-min job *after* launch:
  - Rename Vercel project to whatever you want the subdomain to be (`thesystem`, `hunter-systems`, `dungeon-run`, etc.). Check the rename doesn't collide with another Vercel user's project.
  - Reserve the matching `.com` or `.app` name by noting it down. Do NOT buy yet. Check availability on Porkbun or Cloudflare: `shivaliva.app`, `shivaliva.com`, `shivalivaleveling.com`.
  - **May 4+ (post-salary):** buy the domain ($10–12), point DNS at Vercel. Vercel keeps the `.vercel.app` alias forever — zero link rot.
- [ ] **Fix the `/` landing page** — right now signed-out users hit the SignInGate directly. Build a proper marketing page with:
  - Hero: "Face your shadows. Rank up in real life."
  - 3 screenshots (awakening overlay → dungeons → profile)
  - 7 portals list with one-liners
  - Sign In / Accept button
- [ ] **Add `/privacy` and `/terms` pages** — use https://www.freeprivacypolicy.com or similar. Required for app stores AND looks professional. Legal-safe boilerplate is fine.
- [ ] **Set favicon + OG image** (social preview). One screenshot of your Hunter ID card is enough.

### Day 2 (Apr 23) — Analytics + Retention Hooks

Retention is what turns launches into businesses. Install these before you send traffic.

- [ ] **Install PostHog or Vercel Analytics** (PostHog free tier is plenty). Events to track:
  - `signup`, `dungeon_started`, `quest_completed`, `streak_lost`, `day7_return`
- [ ] **Email hook — "streak recovered"** via Resend (free tier: 100/day, 3k/month). Trigger: user doesn't open app for 3 days with active dungeon. Sadhguru-flavored subject: "The System awaits your return."
- [ ] **PWA install prompt** — smart banner telling users to "Add to Home Screen" on mobile. Most people use mobile for habit apps.
- [ ] **Push notifications** — iOS PWA push works on Safari 16.4+. Optional but massive retention multiplier.

### Day 3 (Apr 24) — Monetization

Do NOT build this before Day 3. You need the app feeling solid first.

**Free / Pro split (recommended):**
- Free: 2 active dungeons at a time, all quests, full radar, full heatmap, 20 achievements
- Pro: unlimited active dungeons, all 64 achievements, streak insurance (1 per month)

**Pricing:** $4.99/mo or $39 lifetime. Heavy bias toward lifetime — indie habit apps convert way better on lifetime deals.

**Use Polar.sh or LemonSqueezy, not raw Stripe.** Both are merchants of record — they handle VAT/sales tax worldwide, which matters because UAE sellers usually can't handle EU VAT registrations solo. ~5% fee vs 0% Stripe is worth every cent for this.

- [ ] Set up Polar.sh account (1 hour)
- [ ] Add paywall component — shown when user tries to activate 3rd dungeon
- [ ] "Upgrade to Pro" CTA in navbar for free users
- [ ] Test purchase flow end-to-end with real card

### Day 4 (Apr 25) — Launch Content Prep

Today is about making the launch *effortless* when it fires. Don't post anything live today.

- [ ] **Screenshots** — 6 total, captioned:
  1. Awakening notification (the hook)
  2. Portals grid (the value)
  3. A dungeon rank ladder mid-progress (the gameplay)
  4. Profile with radar + heatmap (the dopamine)
  5. Trophies cabinet (the completion)
  6. Mobile install / PWA home screen icon (it's real)
- [ ] **Write 5 launch posts** (drafts, don't fire yet):
  - **r/solo_leveling** (540k): "I built a Solo Leveling web app that makes YOU level up in real life"
  - **r/getdisciplined** (2M+): "Built a Solo Leveling-themed habit tracker where your compulsions become dungeons"
  - **r/nofap** (1M+): "Tracking my NoFap streak inside a Solo Leveling app I coded — AMA"
  - **X/Twitter thread** (10 tweets, #buildinpublic #solo_leveling)
  - **Show HN** (HackerNews): "Show HN: Solo Leveling-inspired habit tracker with real dungeon mechanics"
- [ ] **TikTok/Reels**: 30s screen recording with text overlays. Hook: "I turned my depression into a Solo Leveling app."
- [ ] **ProductHunt** — create draft, schedule for Tuesday 12:01 AM PT next week. (PH launches favor Tues/Wed.)

### Day 5 (Apr 26) — Polish Buffer + Smoke Test

The 3 extra days over the original 6-day plan all live here. Use them or you'll burn them on Tetris.

- [ ] Fresh-account smoke test: sign up, awaken, start each of the 7 portals, log events, check profile, trigger paywall. Fix anything that smells off.
- [ ] Mobile smoke test: repeat the above on your phone (iOS Safari + Android Chrome if you can borrow one).
- [ ] Lighthouse score on `/` — should be ≥ 90 on mobile performance + accessibility.
- [ ] Error monitoring: turn on whatever Vercel gives you for free (Vercel Observability or Sentry free tier).

### Day 6 (Apr 27) — Dry Run

Was the original launch day. Now buffer — use it as a rehearsal, not a freeze.

- [ ] Finalize 6 screenshots + 1 hero OG image. Make them look *polished*, not hacked.
- [ ] Finalize all 5 post drafts. Read them aloud. Cut 30% of every post — they're all too long.
- [ ] Pick your launch-day anchor story (the breakup → UAE → $2500 → built the System arc). Write it in first-person once, then reuse across Reddit + HN + X.
- [ ] Set up a dedicated launch-day checklist doc (mini kanban: post, comment, reply, monitor).

### Day 7 (Apr 28) — Back to Work

First day back at the day job. Expect to be tired.

- [ ] No coding today. None. Let it settle.
- [ ] In the evening, 30 min: re-read your post drafts with fresh eyes. You'll want to cut more.
- [ ] Sleep early.

### Day 8 (Apr 29) — Queue + Final Checks (evenings only)

- [ ] Schedule r/solo_leveling + r/getdisciplined + r/nofap drafts (Reddit doesn't natively schedule — use https://later.com or post manually tomorrow).
- [ ] ProductHunt: verify your draft is locked in for Tuesday next week.
- [ ] Paywall smoke test with a real card (yours). Refund yourself afterward.
- [ ] Domain + DNS + HTTPS final verify. Hit the site from 3 devices.
- [ ] Sleep. Launch is tomorrow.

### Day 9 (Apr 30) — 🚀 LAUNCH BLITZ

Don't post everything at once. Staggered windows give you energy to respond to comments in each. You're at work during the day — most of the heavy engagement lands in your evening.

- [ ] **9 AM UAE (before work)** — r/solo_leveling + X thread. Fire and forget until lunch.
- [ ] **Lunch break (1 PM UAE)** — reply to early comments. Don't start new posts yet.
- [ ] **6 PM UAE (post-work)** — r/getdisciplined + r/nofap (peak US morning traffic).
- [ ] **9 PM UAE** — Show HN (peak US daytime).
- [ ] **All evening** — reply to every single comment within 30 min. First 24h comment engagement = Reddit algo love = front-page potential.
- [ ] **Also:** drop in Discord r/nofap servers where it's welcome — as a community member, not a spammer. Link only if asked.

**Extras if any post takes off:** submit to r/decidingtobebetter, r/productivity, r/manhwa, r/Webnovels, r/Stoicism.

### Day 10 (May 1) — React + Harden + Rest

- [ ] Read every piece of feedback. Write it all down. **Don't implement today.**
- [ ] Fix showstopper bugs only (app crashes, signup broken, paywall broken). No new features.
- [ ] Sleep. The marathon has just started. Don't arrive at work Monday fried.

---

## Pre-Launch Polish Checklist

Non-negotiable before you send real traffic:

- [ ] Launch URL live with HTTPS (vercel.app subdomain is fine for v1 — custom domain comes May 4+)
- [ ] Landing page on `/` with clear value prop
- [ ] Privacy policy + Terms of Service
- [ ] Mobile responsive verified on iOS Safari + Android Chrome
- [ ] Onboarding smoke-tested on a fresh account (you already did this — redo after Day 1 changes)
- [ ] OG image for social link previews
- [ ] Analytics installed and firing events
- [ ] Error boundary so one broken page doesn't kill the whole app
- [ ] `robots.txt` + `sitemap.xml`
- [ ] Contact email visible (trojanato@gmail.com is fine for v1 — custom `hunter@thesystem.app` can wait until domain purchase May 4+)

---

## Monetization Decision Tree

**Q: Free tier only?**
No. Free-only means zero revenue signal. You need pricing live on Day 1 or you'll never know if people value it.

**Q: Sub vs. lifetime?**
Offer both. Bias the UI toward lifetime. Reason: habit apps have notoriously high churn after 1–2 months. A $39 lifetime captures the value before the user ghosts. Monthly sub is for the believers.

**Q: Where to paywall?**
At the 3rd active dungeon. Reason: the first 2 portals are enough to feel the product. The 3rd is when they're committed and the dopamine is hooked. Paywalling earlier = bounce. Paywalling later = freeloaders.

**Q: Trial?**
7-day trial on Pro, card required. Or 14-day no-card trial if you're feeling generous. Don't overthink this on Day 3.

---

## Launch Channels (Priority Order)

1. **r/solo_leveling** — perfect audience match. Your #1 shot at going viral.
2. **Show HN** — tech audience loves stories of "I built something for myself".
3. **r/getdisciplined** — massive, value-aligned.
4. **r/nofap** — your NoFap dungeon is an authentic plug here. Don't spam, tell a real story.
5. **X/Twitter #buildinpublic** — slow burn, but repeat posters compound.
6. **TikTok/Reels** — hardest to crack, highest ceiling. One viral clip = 10k users overnight.
7. **ProductHunt** — good for a spike, less good for long-term. Launch when polished.
8. **IndieHackers** — report milestone posts work great here. Start the journal.

**Post angle matters more than platform.** The story that sells:
> "I was depressed after a breakup, broke in the UAE on a $2500/month job, couldn't afford therapy, so I built my own System to force myself to level up. Here it is, free to try."

That's real. That's your angle. Don't hide it.

---

## After Launch (Week 2+)

You're back to work Apr 28; launch hits Apr 30. Available time drops to ~2 hours/night + weekends. The phased post-launch roadmap lives in `ROADMAP.md` — use it, don't reinvent. Priority ladder:

1. **Retention fixes** — whatever the Day 7 cohort is dropping at, fix that
2. **Email drip** — 5-email sequence over first 14 days (welcome, day 3 nudge, day 7 milestone, day 10 retention save, day 14 upgrade pitch)
3. **One new feature per month max** — feature freeze is still in effect. Let the existing 7 portals breathe.
4. **Content marketing weekly** — post a build-in-public update every Monday. Twitter thread + IndieHackers cross-post.
5. **Community** — if you hit 500+ active users, open a Discord. Community is retention rocket fuel.

**Do not quit your job.** Salary is the runway that lets you keep building. You quit when MRR is 2x salary for 3 consecutive months, not before.

---

## Metrics That Matter

Watch daily for the first 2 weeks:

| Metric | Why it matters | Bad | OK | Great |
|---|---|---|---|---|
| Day 1 signups | Awareness reach | <10 | 50 | 200+ |
| Awakening → Dungeon start rate | Onboarding works | <30% | 50% | 70%+ |
| Day 7 retention | You have a business | <10% | 20% | 40%+ |
| Paywall hit rate | Feature friction | <5% | 10% | 20%+ |
| Free → Pro conversion | Price/value match | <1% | 2% | 5%+ |

**Ignore vanity:** Reddit upvotes, Twitter impressions, ProductHunt rank. Those don't pay rent. Day 7 retention does.

---

## Rumination Protocol

You said you're ruminating about your ex. Standard answer is "get over it" — that's useless. Real answer:

- Every time you catch yourself spiraling, open the app, log a quest, log a workout, or start a dungeon. Channel the energy.
- Cold Shower quest is in there for a reason. Use it.
- Exposure Therapy dungeon exists because breaking social isolation is the highest-leverage move when you're lonely. Start at Presence rung today.
- You're sick right now, so the body stuff waits. But even from bed: Meditation quest, Journal quest, Read quest. Three quests today = 30 XP + dimension gains.

The irony: you built the system that fixes your current state. Use it.

---

## Closing Note

You're not a stupid cunt. You're sick, heartbroken, and broke, and instead of drinking or doomscrolling you're building. That's the difference between people who make it and people who don't.

See you in 9 days with a public product.

— Claude