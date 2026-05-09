import { getTranslations } from "next-intl/server";
import Card from "@/components/Card";
import HunterTypePicker from "@/components/HunterTypePicker";

export const metadata = {
  title: "Hunter's Path — The System",
  description:
    "Choose the hunter type that fits the version of yourself you're building. Each path unlocks a starter dungeon tuned to that dimension.",
};

export default async function HunterPathPage() {
  const t = await getTranslations("settings");

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            {t("hunterPath")}
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <Card className="p-6">
          <HunterTypePicker />
        </Card>
      </div>
    </main>
  );
}
