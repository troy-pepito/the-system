"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  // LandingPage owns its own footer when a signed-out visitor lands on "/".
  if (pathname === "/" && isLoaded && !isSignedIn) return null;

  return (
    <footer className="mt-auto border-t border-cyan-500/10 bg-slate-950/50 py-4 px-4">
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-5 text-[9px] tracking-[0.4em] uppercase text-slate-600">
        <Link
          href="/guide"
          className="hover:text-cyan-300 transition-colors"
        >
          {t("manual")}
        </Link>
        <span className="text-slate-800">·</span>
        <Link
          href="/privacy"
          className="hover:text-cyan-300 transition-colors"
        >
          {t("privacy")}
        </Link>
        <span className="text-slate-800">·</span>
        <Link
          href="/terms"
          className="hover:text-cyan-300 transition-colors"
        >
          {t("terms")}
        </Link>
      </div>
    </footer>
  );
}