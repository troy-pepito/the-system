/**
 * The locales this app understands. Adding a new one is two steps:
 *   1. Add the code here.
 *   2. Add a matching `src/messages/<code>.json` with the translated
 *      strings (start by copying en.json and translating values).
 *
 * The locale UI in /settings reads from LOCALE_OPTIONS to render the
 * dropdown, so a new entry there shows up automatically.
 */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "shivaliva-locale";

export const LOCALE_OPTIONS: { value: Locale; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "es", label: "Spanish", native: "Español" },
];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
