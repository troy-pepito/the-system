interface XpBarProps {
  xp: number;
  xpToNext: number;
  level: number;
}

export default function XpBar({ xp, xpToNext, level }: XpBarProps) {
  const percent = Math.round((xp / xpToNext) * 100);

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Experience</p>
        <p className="text-xs text-cyan-400/60">Level {level}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 whitespace-nowrap">
          {xp} / {xpToNext} XP
        </p>
      </div>
    </div>
  );
}