/**
 * Per-rank visual vocabulary — bronze → iron → silver → gold →
 * platinum → holographic. Higher ranks get richer materials and
 * brighter glow so a Lv 50 hunter's profile looks meaningfully
 * different from a Lv 5's. Same tokens get reused on the navbar,
 * hunter card, public profile, friend cards, and the rank-up
 * celebration overlay.
 */
export interface RankStyle {
  /** Foreground text color (Tailwind class). */
  text: string;
  /** Border tone for badges + framed surfaces. */
  border: string;
  /** Background tint for filled badges. */
  bg: string;
  /** Drop-shadow / glow Tailwind class — apply to the same element as text. */
  glow: string;
  /**
   * Special class name for ranks that need custom CSS (currently only S
   * for the animated holographic gradient). Empty string when not used.
   */
  textClass: string;
  /** Short, in-world flavor name. */
  flavor: string;
}

export const RANK_STYLES: Record<string, RankStyle> = {
  E: {
    text: "text-orange-400",
    border: "border-orange-500/50",
    bg: "bg-orange-500/10",
    glow: "drop-shadow-[0_0_8px_rgba(251,146,60,0.55)]",
    textClass: "",
    flavor: "Bronze",
  },
  D: {
    text: "text-slate-200",
    border: "border-slate-300/60",
    bg: "bg-slate-400/15",
    glow: "drop-shadow-[0_0_9px_rgba(203,213,225,0.55)]",
    textClass: "",
    flavor: "Iron",
  },
  C: {
    text: "text-zinc-100",
    border: "border-zinc-200/70",
    bg: "bg-zinc-100/15",
    glow: "drop-shadow-[0_0_11px_rgba(244,244,245,0.65)]",
    textClass: "",
    flavor: "Silver",
  },
  B: {
    text: "text-amber-300",
    border: "border-amber-400/70",
    bg: "bg-amber-500/15",
    glow: "drop-shadow-[0_0_12px_rgba(251,191,36,0.75)]",
    textClass: "",
    flavor: "Gold",
  },
  A: {
    text: "text-cyan-200",
    border: "border-cyan-300/70",
    bg: "bg-cyan-400/15",
    glow: "drop-shadow-[0_0_15px_rgba(103,232,249,0.75)]",
    textClass: "",
    flavor: "Platinum",
  },
  S: {
    // Holographic — see globals.css for the .rank-holo-text rule.
    text: "",
    border: "border-fuchsia-300/70",
    bg: "bg-fuchsia-500/10",
    glow: "drop-shadow-[0_0_18px_rgba(217,70,239,0.7)]",
    textClass: "rank-holo-text",
    flavor: "Holo",
  },
};

export function getRankStyle(rank: string): RankStyle {
  return RANK_STYLES[rank] ?? RANK_STYLES.E;
}

/**
 * Convenience: combined "badge"-shaped class string for a small chip
 * containing a rank letter. Compose with surrounding layout classes.
 */
export function rankBadgeClass(rank: string): string {
  const s = getRankStyle(rank);
  return [
    s.bg,
    s.border,
    s.text,
    s.glow,
    s.textClass,
    "border rounded font-bold",
  ].join(" ");
}
