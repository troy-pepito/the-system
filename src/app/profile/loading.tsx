import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 animate-pulse">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Hunter Profile
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2 flex flex-col items-center">
                <div className="h-2 w-12 bg-slate-800 rounded" />
                <div className="h-8 w-16 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="h-3 w-32 bg-slate-800 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 bg-slate-800/60 rounded" />
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-800 rounded" />
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-900/50 border border-slate-800 rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}