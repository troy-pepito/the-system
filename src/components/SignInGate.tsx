"use client";
import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const PUBLIC_ROUTES = ["/", "/guide", "/privacy", "/terms"];

export default function SignInGate() {
  const { openSignIn } = useClerk();
  const pathname = usePathname();

  if (PUBLIC_ROUTES.includes(pathname)) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950 px-6">
      <div className="relative max-w-md w-full mx-auto">
        <div className="absolute -inset-px border border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.4),inset_0_0_20px_rgba(34,211,238,0.1)] pointer-events-none" />
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
        <div className="relative bg-slate-950/80 p-10 sm:p-12 text-center font-mono space-y-6">
          <p className="text-[10px] tracking-[0.5em] text-cyan-400/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
            [ AUTHENTICATION ]
          </p>
          <p className="text-sm sm:text-base tracking-widest text-cyan-200">
            Bind your identity to The System.
          </p>
          <p className="text-xs tracking-wider text-slate-500 max-w-xs mx-auto">
            Sign in with Google to claim your run.
          </p>
          <button
            onClick={() => openSignIn()}
            className="px-8 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 hover:text-white transition-all shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}