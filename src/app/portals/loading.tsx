import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 animate-pulse">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-300">
            Portal Registry
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-2 w-16 bg-slate-800 rounded" />
                <div className="h-5 w-40 bg-slate-800 rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-slate-800/60 rounded" />
            <div className="h-3 w-3/4 bg-slate-800/60 rounded" />
            <div className="h-10 w-full bg-slate-800/40 rounded" />
          </Card>
        ))}
      </div>
    </main>
  );
}