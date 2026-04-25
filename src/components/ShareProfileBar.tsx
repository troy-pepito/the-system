"use client";
import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function ShareProfileBar() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);

  if (!isLoaded || !user) return null;

  const path = `/h/${user.id}`;

  async function copy() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.3em] uppercase">
      <button
        type="button"
        onClick={copy}
        className="text-slate-500 hover:text-cyan-300 transition-colors"
      >
        {copied ? "✓ Link Copied" : "Share Profile"}
      </button>
      <span className="text-slate-700">·</span>
      <Link
        href={path}
        className="text-slate-500 hover:text-cyan-300 transition-colors"
      >
        View Public
      </Link>
    </div>
  );
}