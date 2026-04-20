import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/80 border border-cyan-500/20 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.15)] ${className}`}
    >
      {children}
    </div>
  );
}