// Pure event helper for the rank-up share prompt. Lives outside
// RankUpShare.tsx so dev tooling (DevTestPanel) and other callers can
// fire the prompt without dragging the whole RankUpShare component
// into the eager bundle. RankUpShare itself can then be dynamic
// imported.

export const RANK_UP_SHARE_EVENT = "system:rank-up-share";

export interface RankUpSharePair {
  from: string;
  to: string;
}

/** Fired by the dev panel (or future callers) to test the share prompt. */
export function fireRankUpSharePrompt(detail: RankUpSharePair): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RankUpSharePair>(RANK_UP_SHARE_EVENT, { detail })
  );
}
