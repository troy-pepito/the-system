interface StatCardProps {
  name: string;
  value: number;
}

export default function StatCard({ name, value }: StatCardProps) {
  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-lg p-4 text-center shadow-[0_0_10px_rgba(34,211,238,0.1)]">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{name}</p>
      <p className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">{value}</p>
    </div>
  );
}
