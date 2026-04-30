"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NOTICE_EVENT, type SystemNotice } from "@/lib/player";

interface ActiveNotice extends SystemNotice {
  id: number;
}

let nextId = 1;

/**
 * Bracket-text [System] callouts for moments that aren't XP rewards
 * but deserve a beat of confirmation — journal saved, entry deleted,
 * future "quest accepted" / "title acquired" style announcements.
 *
 * Stacks vertically when multiple fire close together. Auto-dismisses
 * after 4.5s; CTA link click dismisses early.
 */
export default function SystemNoticeToast() {
  const [notices, setNotices] = useState<ActiveNotice[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SystemNotice>).detail;
      if (!detail || !detail.headline) return;
      const id = nextId++;
      setNotices((prev) => [...prev, { ...detail, id }]);
      setTimeout(() => {
        setNotices((prev) => prev.filter((n) => n.id !== id));
      }, 4500);
    };
    window.addEventListener(NOTICE_EVENT, handler);
    return () => window.removeEventListener(NOTICE_EVENT, handler);
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="fixed top-[18vh] left-1/2 -translate-x-1/2 z-[160] flex flex-col items-center gap-2 pointer-events-none w-[min(92vw,28rem)]">
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} onDismiss={() =>
          setNotices((prev) => prev.filter((x) => x.id !== n.id))
        } />
      ))}
    </div>
  );
}

function NoticeCard({
  notice,
  onDismiss,
}: {
  notice: ActiveNotice;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-auto w-full bg-slate-950/90 backdrop-blur-sm border border-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.45),inset_0_0_18px_rgba(34,211,238,0.06)] px-4 py-3 animate-gain-pop relative">
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

      <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)] text-center">
        [ {notice.headline} ]
      </p>
      {notice.body && (
        <p className="text-xs text-slate-300 text-center mt-1.5 leading-relaxed">
          {notice.body}
        </p>
      )}
      {notice.link && (
        <div className="text-center mt-2">
          <Link
            href={notice.link.href}
            onClick={onDismiss}
            className="inline-block text-[10px] tracking-[0.3em] uppercase text-cyan-300 border-b border-cyan-400/40 hover:text-cyan-100 hover:border-cyan-300 transition-colors pb-0.5"
          >
            {notice.link.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
