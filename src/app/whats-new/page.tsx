"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Card from "@/components/Card";
import {
  CHANGELOG,
  LATEST_VERSION,
  markVersionSeen,
  type ChangelogChange,
} from "@/lib/changelog";

export default function WhatsNewPage() {
  const t = useTranslations("whatsNew");
  // Mark the latest version as seen the moment the user lands here.
  // Clears the navbar NEW badge for them.
  useEffect(() => {
    markVersionSeen(LATEST_VERSION);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.5em] uppercase text-cyan-400/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {t("header")}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-cyan-100 tracking-wider mt-3">
            {t("title")}
          </h1>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <Link
            href="/"
            className="inline-block mt-4 text-[10px] tracking-[0.3em] uppercase text-slate-500 hover:text-cyan-300 transition-colors"
          >
            {t("backToStatus")}
          </Link>
        </div>

        {CHANGELOG.length === 0 ? (
          <Card className="p-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("empty")}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {CHANGELOG.map((entry, idx) => {
              const isLatest = idx === 0;
              return (
                <Card
                  key={entry.version}
                  className={`p-6 ${
                    isLatest
                      ? "border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
                      : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-mono text-[11px] tracking-widest text-cyan-300">
                        v{entry.version}
                      </span>
                      {isLatest && (
                        <span className="text-[9px] tracking-[0.3em] uppercase text-amber-300 px-1.5 py-0.5 border border-amber-400/50 bg-amber-500/10 rounded-sm">
                          {t("latest")}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] tracking-widest text-slate-500 font-mono">
                      {entry.date}
                    </p>
                  </div>
                  <p className="text-base font-bold text-cyan-100 tracking-wider mb-4">
                    {entry.title}
                  </p>
                  <ul className="space-y-2.5">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span
                          className={`shrink-0 mt-0.5 text-[9px] uppercase tracking-[0.25em] px-1.5 py-0.5 border rounded-sm ${changeTone(
                            c.kind
                          )}`}
                        >
                          {kindLabel(c.kind, t)}
                        </span>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {c.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function changeTone(kind: ChangelogChange["kind"]): string {
  if (kind === "feature")
    return "text-emerald-300 border-emerald-400/40 bg-emerald-500/10";
  if (kind === "fix") return "text-red-300 border-red-500/40 bg-red-500/10";
  return "text-slate-300 border-slate-600 bg-slate-800/60";
}

function kindLabel(
  kind: ChangelogChange["kind"],
  t: (key: string) => string
): string {
  if (kind === "feature") return t("kindFeature");
  if (kind === "fix") return t("kindFix");
  return t("kindChange");
}
