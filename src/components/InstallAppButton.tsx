"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  detectInstallState,
  subscribeInstallState,
  triggerInstall,
  type InstallState,
} from "@/lib/pwaInstall";

export default function InstallAppButton() {
  const t = useTranslations("installApp");
  const [state, setState] = useState<InstallState>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const update = () => setState(detectInstallState());
    update();
    return subscribeInstallState(update);
  }, []);

  async function handleInstall() {
    setWorking(true);
    await triggerInstall();
    setWorking(false);
  }

  if (state === "loading" || state === "installed") {
    if (state === "installed") {
      return (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 uppercase tracking-wider">
              {t("title")}
            </p>
            <p className="text-xs text-emerald-400/70 leading-relaxed mt-1">
              {t("installed")}
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 uppercase tracking-wider">
          {t("title")}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          {state === "available" && t("available")}
          {state === "ios" &&
            t.rich("iosInstructions", {
              strong: (chunks) => (
                <span className="text-cyan-300 font-bold">{chunks}</span>
              ),
            })}
          {state === "unsupported" && t("unsupported")}
        </p>
      </div>
      {state === "available" && (
        <button
          type="button"
          onClick={handleInstall}
          disabled={working}
          className="shrink-0 px-4 py-2 bg-cyan-500/20 border border-cyan-400/60 text-cyan-100 text-xs uppercase tracking-[0.3em] hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(34,211,238,0.35)]"
        >
          {working ? t("installing") : t("install")}
        </button>
      )}
    </div>
  );
}
