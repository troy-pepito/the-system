"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getJournalEntries,
  type JournalEntry,
} from "@/app/actions/dungeons";
import JournalSection from "@/components/JournalSection";
import { readCache, writeCache } from "@/lib/offlineCache";
import { STATS_UPDATED_EVENT, hasPendingMutations } from "@/lib/player";

const JOURNAL_CACHE_KEY = "journal";

export default function JournalPage() {
  const t = useTranslations("journal");
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const cached = readCache<JournalEntry[]>(JOURNAL_CACHE_KEY);
    if (cached && cached.length > 0) setEntries(cached);

    const load = () => {
      getJournalEntries()
        .then((j) => {
          // Skip clobbering optimistic state while a journal mutation
          // (pin / edit / delete) is in flight. Same guard pattern the
          // calendar check-in panel uses.
          if (hasPendingMutations()) return;
          writeCache(JOURNAL_CACHE_KEY, j);
          setEntries(j);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener(STATS_UPDATED_EVENT, load);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, load);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-300">
            {t("title")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <Link
            href="/profile"
            className="inline-block mt-4 text-[10px] tracking-[0.3em] uppercase text-slate-500 hover:text-cyan-300 transition-colors"
          >
            {t("backToProfile")}
          </Link>
        </div>

        <JournalSection
          entries={entries}
          onEntriesChange={(next) => {
            setEntries(next);
            writeCache(JOURNAL_CACHE_KEY, next);
          }}
        />
      </div>
    </main>
  );
}
