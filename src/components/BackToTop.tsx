"use client";
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={`fixed bottom-4 right-4 z-[90] w-10 h-10 flex items-center justify-center bg-slate-900/85 border border-cyan-400/40 text-cyan-200 rounded shadow-[0_0_14px_rgba(34,211,238,0.3)] backdrop-blur hover:bg-cyan-500/20 hover:border-cyan-400 active:scale-95 transition-all ${
        visible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none translate-y-2"
      }`}
    >
      <span className="text-sm leading-none">↑</span>
    </button>
  );
}