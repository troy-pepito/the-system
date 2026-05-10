"use client";
import { useEffect, useState } from "react";

// Shown when the middleware redirected someone here from the legacy
// Vercel URL (`?migrated=1` in the URL). Explains that their old
// Clerk-tied data didn't carry over and that they should sign up
// fresh, with a path to request restoration via the bug report flow.
//
// Reads window.location.search directly instead of useSearchParams to
// avoid forcing the whole layout into a Suspense boundary.
export default function MigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("migrated") === "1") setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("migrated");
    // history.replaceState avoids a re-render, we're already in the
    // dismissed state, no need for the router to do anything.
    window.history.replaceState({}, "", url.toString());
  }

  if (!show) return null;

  return (
    <div className="relative z-[400] bg-cyan-950/90 border-b border-cyan-500/40 backdrop-blur-sm px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-start gap-3">
        <p className="text-xs sm:text-sm text-cyan-100 leading-relaxed flex-1">
          <strong className="text-cyan-300 font-semibold">
            Welcome to the new domain.
          </strong>{" "}
          Shivaliva Leveling has moved to{" "}
          <strong className="text-cyan-300">shivalivaleveling.com</strong>. If
          you used the previous URL, your hunter name and streak data did
          <em>not</em> carry over, sign up fresh to continue. To request
          restoration of your old data, reach out via the &quot;Report a
          Bug&quot; link in the footer once you&apos;re signed in.
        </p>
        <button
          onClick={dismiss}
          className="text-cyan-400/70 hover:text-cyan-200 transition-colors px-2 -mt-1 text-base leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
