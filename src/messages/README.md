# Messages

User-facing strings that vary by locale live here. One JSON file per locale, keys nested by feature.

## Adding a new string

1. Add the key + English text to `en.json`.
2. Mirror the structure in every other locale file (`es.json`, etc.).
   English text is the fallback if a translation is missing — copy
   the English value rather than leaving an empty string.
3. Use it from a component:
   - **Client component**:
     ```tsx
     import { useTranslations } from "next-intl";
     const t = useTranslations("nav");
     return <span>{t("feed")}</span>;
     ```
   - **Server component**:
     ```tsx
     import { getTranslations } from "next-intl/server";
     const t = await getTranslations("nav");
     return <span>{t("feed")}</span>;
     ```

## Adding a new locale

1. Add the code to `LOCALES` in `src/i18n/config.ts`.
2. Add a matching entry to `LOCALE_OPTIONS` (with the native-language label).
3. Copy `en.json` → `<code>.json` and translate the values.

## Status

Source of truth is `en.json`. The other locales are AI-translated for
the small set of keyed strings — accurate enough for navigation
labels, but worth a native-speaker pass before any of these go in
brand-critical copy.

- `en` — English (source)
- `es` — Español
- `pt` — Português
- `fr` — Français
- `de` — Deutsch
- `ja` — 日本語
- `ko` — 한국어
- `zh` — 中文 (Simplified)
- `hi` — हिन्दी

## What's keyed today

- Navbar (`nav.*`)
- Settings page section labels + language picker (`settings.*`)
- Dashboard header + empty-state CTA (`dashboard.*`)
- Hunter card stat labels — Hunter ID / Name / Rank / Level / XP /
  Edit / Scattered / View Public / Choose your path (`hunterCard.*`)
- Daily Quests header + 7 quest names (`dailyQuests.*`)
- Portals page — section headers, subtitles, all action labels,
  rules-of-engagement header, locked-path UX (`portals.*`)

Still hardcoded English (next sweep targets):
- Dungeon names, descriptions, rules (DUNGEONS array — needs the
  message-key refactor since strings live in code, not JSX)
- Achievement names + descriptions
- Push notification copy (cron route)
- /feed page
- /journal + /h/[hunterId] (public profile)
- /guide
- /ranks (rank gallery flavor copy)
- Hunter Type names + descriptions
- Various smaller modals (NoteModal, exit/relapse copy, etc.)
