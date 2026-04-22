"use client";
import { usePathname } from "next/navigation";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="relative animate-fade-in-up">
      <div
        aria-hidden
        className="fixed left-0 right-0 top-0 h-px z-[197] pointer-events-none animate-sweep-in"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(34,211,238,0.6), transparent)",
          boxShadow: "0 0 14px rgba(34,211,238,0.5)",
        }}
      />
      {children}
    </div>
  );
}