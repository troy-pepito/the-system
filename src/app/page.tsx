import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-center text-blue-400 mb-4">
          The System
          </h1>
        <p className="text-center text-slate-300 mb-8">
          Your Solo Leveling-inspired self-improvement system.
          </p>
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-green-400 mb-2">Awakening Status</h2>
          <p className="text-slate-400">Rank: E</p>
          <p className="text-slate-400">Level: 1</p>
        </div>
      </div>
    </main>
  );
}
