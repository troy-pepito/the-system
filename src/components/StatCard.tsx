interface StatCardProps {
  name: string;
  value: number;
}

export default function StatCard({ name, value }: StatCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-4">
      <p className="text-slate-400 text-sm">{name}</p>
      <p className="text-2xl font-bold text-yellow-400">{value}</p>
    </div>
  );
}
