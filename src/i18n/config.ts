/**
 * The locales this app understands. Adding a new one is two steps:
 *   1. Add the code here.
 *   2. Add a matching `src/messages/<code>.json` with the translated
 *      strings (start by copying en.json and translating values).
 *
 * The locale UI in /settings reads from LOCALE_OPTIONS to render the
 * dropdown, so a new entry there shows up automatically.
 */
export const LOCALES = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "ja",
  "ko",
  "zh",
  "hi",
] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "shivaliva-locale";

// Order matches the picker's render order. Native labels (the speaker's
// own word for their language) are what users actually scan for, so
// those drive the visible option text — `label` stays around for any
// future analytics / debug surface.
export const LOCALE_OPTIONS: { value: Locale; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "es", label: "Spanish", native: "Español" },
  { value: "pt", label: "Portuguese", native: "Português" },
  { value: "fr", label: "French", native: "Français" },
  { value: "de", label: "German", native: "Deutsch" },
  { value: "ja", label: "Japanese", native: "日本語" },
  { value: "ko", label: "Korean", native: "한국어" },
  { value: "zh", label: "Chinese", native: "中文" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
