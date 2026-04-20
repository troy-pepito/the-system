import Card from "@/components/Card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 animate-pulse">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Player Status Window
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <Card className="p-6 space-y-4">
          <div className="h-3 w-32 bg-slate-800 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonStat />
            <SkeletonStat />
          </div>
        </Card>

        <div>
          <div className="h-3 w-24 bg-slate-800 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBox />
            <SkeletonBox />
            <SkeletonBox />
            <SkeletonBox />
            <div className="col-span-2">
              <SkeletonBox />
            </div>
          </div>
        </div>

        <Card className="p-6 space-y-3">
          <div className="h-3 w-32 bg-slate-800 rounded" />
          <div className="h-20 w-full bg-slate-800/50 rounded" />
        </Card>
      </div>
    </main>
  );
}

function SkeletonStat() {
  return (
    <div className="space-y-2">
      <div className="h-2 w-16 bg-slate-800 rounded" />
      <div className="h-7 w-20 bg-slate-800 rounded" />
    </div>
  );
}

function SkeletonBox() {
  return <div className="h-16 bg-slate-900/80 border border-cyan-500/10 rounded-xl" />;
}