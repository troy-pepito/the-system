"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Handler for one-tap sign-in tokens minted via Clerk's Backend API
 * (POST /v1/sign_in_tokens). DM the resulting URL to a user who is
 * stuck in the normal sign-in flow, e.g. iOS standalone PWA users whose
 * client never picks up Clerk's verification success response.
 *
 * URL shape: https://shivalivaleveling.com/finish-signin?__clerk_ticket=<token>
 *
 * The component reads the ticket from the query string, exchanges it
 * via the SignIn ticket strategy, activates the session, then bounces
 * the player to /. The Suspense wrapper is required for App Router's
 * useSearchParams to render outside the SSG branch.
 */
function FinishSignInInner() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!isLoaded || !signIn) return;
    const ticket = params.get("__clerk_ticket");
    if (!ticket) {
      setStatus("error");
      setErrMsg("No sign-in token in the link.");
      return;
    }
    (async () => {
      try {
        const attempt = await signIn.create({ strategy: "ticket", ticket });
        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActive({ session: attempt.createdSessionId });
          router.replace("/");
          return;
        }
        setStatus("error");
        setErrMsg("Sign-in didn't complete. Ask Troy for a fresh link.");
      } catch (e) {
        setStatus("error");
        setErrMsg(
          e instanceof Error
            ? e.message
            : "Sign-in failed. Ask Troy for a fresh link."
        );
      }
    })();
  }, [isLoaded, signIn, setActive, params, router]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="relative max-w-md w-full mx-auto">
        <div className="absolute -inset-px border border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.4),inset_0_0_20px_rgba(34,211,238,0.1)] pointer-events-none" />
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
        <div className="relative bg-slate-950/80 p-10 sm:p-12 text-center font-mono space-y-6">
          <p className="text-[10px] tracking-[0.5em] text-cyan-400/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            [ AUTHENTICATING ]
          </p>
          {status === "working" ? (
            <p className="text-sm sm:text-base tracking-widest text-cyan-200 animate-pulse">
              Binding identity to The System...
            </p>
          ) : (
            <>
              <p className="text-sm sm:text-base tracking-widest text-rose-300">
                AUTHENTICATION FAILED
              </p>
              <p className="text-xs tracking-wider text-slate-500 max-w-xs mx-auto">
                {errMsg}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function FinishSignInPage() {
  return (
    <Suspense fallback={null}>
      <FinishSignInInner />
    </Suspense>
  );
}
