# The System — Implemented Features

Last updated: 2026-04-17

## Core UI

### Player Status Window (Home page)
- Cyan holographic "System" title with glow effect and gradient divider
- "Player Status Window" subtitle
- Dark slate background, all cards share a consistent border-glow aesthetic

### Awakening Status card
- Displays current **Rank** (E → D → C → B → A → S) with amber glow
- Displays current **Level** with emerald glow
- Both values are dynamically calculated from total XP

### XP Bar
- Global progress bar shared across all sources of XP
- Shows current XP / XP needed for next level
- Animated fill transition (CSS `transition-all duration-700 ease-out`)
- Gradient cyan fill with a subtle glow

### Dimensions (Stats)
Passive display cards for the 5 dimensions of being:
- **BODY** — physical
- **MIND** — intellectual
- **EMOTION** — emotional
- **ENERGY** — pranic / life-force
- **SPIRIT** — transcendent (full-width card, below the 2x2 grid)

Currently all static at 0 — interaction model pending.

### NoFap Streak Tracker
- Date picker to set the streak start date (with "Confirm" button to prevent accidental triggers when navigating months)
- Max date capped at today (can't pick future dates)
- Shows current streak as `{N} days strong`
- "Relapse — Reset" button to clear the streak
- Persists across refreshes via localStorage
- Callback prop pattern — when streak changes, notifies parent to recalculate XP

## Game Mechanics

### XP System
- **Scaling XP curve**: `XP to next level = 100 × level^1.5`
  - Level 1 → 2: 100 XP
  - Level 5 → 6: ~1,118 XP
  - Level 10 → 11: ~3,162 XP
- Early levels feel rewarding, later levels require real long-term consistency

### Rank System
- 6 ranks: **E, D, C, B, A, S**
- 1 rank-up per 10 levels
- E (Lv 1–10) → D (Lv 11–20) → C → B → A → S (Lv 51+)

### XP Sources
- **NoFap streak**: +10 XP per day of active streak
- (Other dimension XP sources TBD — awaiting Troy's design)

## Technical Foundation

### Stack
- Next.js 16.2.3 with App Router
- React 19
- TypeScript
- Tailwind CSS v4 (arbitrary values, CSS-based config)
- pnpm

### Components
- `StatCard` — simple stat display (name + value)
- `StreakCard` — NoFap tracker with date picker, localStorage persistence
- `XpBar` — global XP progress bar with animated fill
- `CheckInCard` — reusable daily check-in card (currently unused, kept in repo for future)

### State Management
- `useState` + `useEffect` for local component state
- **Lifting state up**: parent (`page.tsx`) owns streak data, passes to children via props
- **Callback props**: children notify parent of state changes via `onStreakChange(days)`
- **localStorage**: persists streak start date across refreshes

### Styling Conventions
- Cyan/teal for primary UI accents
- Amber for rank, emerald for level/active-streak
- Red/dimmed for destructive actions (relapse)
- Tailwind arbitrary values for custom glows: `drop-shadow-[0_0_Xpx_rgba(...)]`
- All cards: `bg-slate-900/80 border border-cyan-500/20 rounded-xl`

## What's Next
- Dimension interaction model (Troy planning)
- Possibly: LEVEL UP animation when XP threshold crossed
- Future modules: database persistence (Prisma + PostgreSQL), auth (Auth.js), quests system, dungeons