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

- **`en`** — source of truth, fully populated.
- **`es`** — placeholder translations for the keys that exist; broader copy still hardcoded in English. Expand as keying spreads.

## What's keyed today

- Navbar (`nav.*`)
- Settings page section labels + language picker (`settings.*`)

Most copy is still hardcoded English. Key new strings as you add them.
