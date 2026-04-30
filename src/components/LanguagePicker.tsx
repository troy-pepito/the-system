"use client";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/actions/locale";
import { LOCALE_OPTIONS, type Locale } from "@/i18n/config";

export default function LanguagePicker() {
  const t = useTranslations("settings");
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === current) return;
    startTransition(async () => {
      await setLocale(next);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 uppercase tracking-wider">
            {t("language")}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            {t("languageHint")}
          </p>
        </div>
        <select
          value={current}
          onChange={handleChange}
          disabled={pending}
          aria-label={t("language")}
          className="shrink-0 bg-slate-900 border border-slate-700 rounded text-cyan-200 text-xs uppercase tracking-wider px-3 py-2 hover:border-cyan-500/50 focus:border-cyan-400 focus:outline-none transition-colors disabled:opacity-50"
        >
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.native}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
