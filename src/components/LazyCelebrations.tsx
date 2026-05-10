"use client";
import dynamic from "next/dynamic";

// Defer the rare-event celebration overlays. These all listen for
// custom events fired from @/lib/player (notifyRankUp, notifyLevelUp,
// notifyReward, etc.), the events only fire from user interactions
// well after hydration, so we never miss one by loading these on the
// client only. Keeps the initial JS bundle ~10-15kB lighter on the
// critical path.
//
// Excluded on purpose:
// - AchievementToast / GainToast / SystemNoticeToast: fire on common
//   actions (quest toggles, pop notices), keep eager.
// - AwakeningOverlay: needed immediately for new users, no defer.
const BigCelebration = dynamic(() => import("./BigCelebration"), {
  ssr: false,
});
const RankUpGlitch = dynamic(() => import("./RankUpGlitch"), { ssr: false });
const RankUpCelebration = dynamic(() => import("./RankUpCelebration"), {
  ssr: false,
});
const RankUpShare = dynamic(() => import("./RankUpShare"), { ssr: false });
const LevelUpToast = dynamic(() => import("./LevelUpToast"), { ssr: false });

export default function LazyCelebrations() {
  return (
    <>
      <BigCelebration />
      <RankUpGlitch />
      <RankUpCelebration />
      <RankUpShare />
      <LevelUpToast />
    </>
  );
}
