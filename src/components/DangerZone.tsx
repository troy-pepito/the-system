"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { deleteAccount } from "@/app/actions/account";

/**
 * In-app account deletion. Required by Play Store policy for any app
 * with user accounts — the email-based path in /privacy section 6 is
 * the legal minimum but not store-policy compliant.
 *
 * Confirmation gate: the player has to type their hunter name (case-
 * insensitive) before the Delete button enables. Stronger than a
 * 2-tap confirm because this is irreversible.
 */
export default function DangerZone() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const meta = user?.unsafeMetadata as { hunterName?: string } | undefined;
  const hunterName =
    meta?.hunterName || user?.firstName || user?.username || "";
  const canConfirm =
    hunterName.length > 0 &&
    typed.trim().toLowerCase() === hunterName.toLowerCase();

  function handleDelete() {
    if (!canConfirm || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
        // Clerk session is gone (the action deletes the user) — sign
        // out forces the local Clerk session cookie to clear. Then
        // bounce to landing.
        await signOut({ redirectUrl: "/" });
        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("deleteAccountError"));
      }
    });
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-red-400/80">
            {t("dangerZone")}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            {t("deleteAccountIntro")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTyped("");
            setError(null);
            setOpen(true);
          }}
          className="w-full px-4 py-2.5 bg-red-500/10 border border-red-500/40 text-red-300 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-red-500/20 transition-colors rounded-sm"
        >
          {t("deleteAccountButton")}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-slate-900/95 border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-red-400 pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-red-400 pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-red-400 pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-red-400 pointer-events-none" />

            <button
              type="button"
              onClick={() => !pending && setOpen(false)}
              disabled={pending}
              aria-label={t("deleteAccountCancel")}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-950 border border-red-500/60 text-red-300 text-sm leading-none hover:brightness-150 transition-all shadow-md disabled:opacity-50"
            >
              ✕
            </button>

            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-red-400/80 mb-2">
                {t("deleteAccountConfirmHeader")}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {t("deleteAccountConfirmBody")}
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-name"
                className="block text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-1.5"
              >
                {hunterName}
              </label>
              <input
                id="confirm-name"
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={t("deleteAccountTypePlaceholder")}
                autoComplete="off"
                disabled={pending}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-red-500/60 focus:outline-none text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 rounded-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-slate-800/60 transition-colors disabled:opacity-50 rounded-sm"
              >
                {t("deleteAccountCancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || pending}
                className="flex-1 px-4 py-2.5 bg-red-500/20 border border-red-500/60 text-red-200 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-sm"
              >
                {pending
                  ? t("deleteAccountDeleting")
                  : t("deleteAccountConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
