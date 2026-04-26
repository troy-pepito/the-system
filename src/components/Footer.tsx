import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-cyan-500/10 bg-slate-950/50 py-4 px-4">
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-5 text-[9px] tracking-[0.4em] uppercase text-slate-600">
        <Link
          href="/guide"
          className="hover:text-cyan-300 transition-colors"
        >
          Manual
        </Link>
        <span className="text-slate-800">·</span>
        <Link
          href="/privacy"
          className="hover:text-cyan-300 transition-colors"
        >
          Privacy
        </Link>
        <span className="text-slate-800">·</span>
        <Link
          href="/terms"
          className="hover:text-cyan-300 transition-colors"
        >
          Terms
        </Link>
      </div>
    </footer>
  );
}