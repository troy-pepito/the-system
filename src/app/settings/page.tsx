import Card from "@/components/Card";
import AtmosphereToggle from "@/components/AtmosphereToggle";
import NotificationSettings from "@/components/NotificationSettings";
import InstallAppButton from "@/components/InstallAppButton";

export const metadata = {
  title: "Settings — Shivaliva Leveling",
  description:
    "Tune notifications, install the app, and adjust the look of your hunter window.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-cyan-400/60">
            Settings
          </p>
          <div className="mx-auto mt-3 h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Appearance
          </p>
          <AtmosphereToggle />
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Notifications
          </p>
          <NotificationSettings />
        </Card>

        <Card className="p-6">
          <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-4">
            Install
          </p>
          <InstallAppButton />
        </Card>
      </div>
    </main>
  );
}
