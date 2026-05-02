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
  /** Short, in-world flavor name (Bronze, Iron, ...). */
  flavor: string;
  /**
   * Box-shadow + inset glow for the hunter-ID card frame. Intensity
   * scales with rank — E sits subdued, S radiates dramatically.
   */
  cardGlow: string;
  /** Border color for the hunter-ID card frame's outer border. */
  cardBorder: string;
  /** Border color for the four corner brackets on the hunter-ID frame. */
  cornerBorder: string;
  /** Story title used in the rank gallery, e.g. "The Awakened". */
  title: string;
  /** Description shown on the rank gallery card. */
  description: string;
}

export const RANK_STYLES: Record<string, RankStyle> = {
  E: {
    text: "text-orange-400",
    border: "border-orange-500/50",
    bg: "bg-orange-500/10",
    glow: "drop-shadow-[0_0_8px_rgba(251,146,60,0.55)]",
    textClass: "",
    flavor: "Bronze",
    cardGlow:
      "shadow-[0_0_25px_rgba(251,146,60,0.20),inset_0_0_18px_rgba(251,146,60,0.05)]",
    cardBorder: "border-orange-500/40",
    cornerBorder: "border-orange-400",
    title: "The Awakened",
    description:
      "You've stepped into the System. The path begins. The body still slumbers and the mind still wanders — but you've shown up, and that is enough.",
  },
  D: {
    text: "text-slate-200",
    border: "border-slate-300/60",
    bg: "bg-slate-400/15",
    glow: "drop-shadow-[0_0_9px_rgba(203,213,225,0.55)]",
    textClass: "",
    flavor: "Iron",
    cardGlow:
      "shadow-[0_0_28px_rgba(203,213,225,0.22),inset_0_0_18px_rgba(203,213,225,0.06)]",
    cardBorder: "border-slate-300/50",
    cornerBorder: "border-slate-200",
    title: "The Disciplined",
    description:
      "Routine becomes ritual. The first habits hold even when no one watches — even when you yourself don't want to. The hunter taking shape.",
  },
  C: {
    text: "text-zinc-100",
    border: "border-zinc-200/70",
    bg: "bg-zinc-100/15",
    glow: "drop-shadow-[0_0_11px_rgba(244,244,245,0.65)]",
    textClass: "",
    flavor: "Silver",
    cardGlow:
      "shadow-[0_0_34px_rgba(244,244,245,0.26),inset_0_0_20px_rgba(244,244,245,0.07)]",
    cardBorder: "border-zinc-200/55",
    cornerBorder: "border-zinc-100",
    title: "The Cultivated",
    description:
      "What was effort becomes default. The body and mind compound on each other. You no longer fight to wake up early — you wake. The System recognizes you.",
  },
  B: {
    text: "text-amber-300",
    border: "border-amber-400/70",
    bg: "bg-amber-500/15",
    glow: "drop-shadow-[0_0_12px_rgba(251,191,36,0.75)]",
    textClass: "",
    flavor: "Gold",
    cardGlow:
      "shadow-[0_0_40px_rgba(251,191,36,0.32),inset_0_0_22px_rgba(251,191,36,0.08)]",
    cardBorder: "border-amber-400/55",
    cornerBorder: "border-amber-300",
    title: "The Bound",
    description:
      "Self has met self. The shadows that ran the show now answer to you. The hunter holds territory in the inner world. Few make it this far.",
  },
  A: {
    text: "text-cyan-200",
    border: "border-cyan-300/70",
    bg: "bg-cyan-400/15",
    glow: "drop-shadow-[0_0_15px_rgba(103,232,249,0.75)]",
    textClass: "",
    flavor: "Platinum",
    cardGlow:
      "shadow-[0_0_46px_rgba(103,232,249,0.38),inset_0_0_24px_rgba(103,232,249,0.09)]",
    cardBorder: "border-cyan-300/60",
    cornerBorder: "border-cyan-200",
    title: "The Ascendant",
    description:
      "Beyond what most ever know of themselves. The five dimensions move in concert. You are the version of you that strangers feel before you speak.",
  },
  S: {
    // Holographic — see globals.css for the .rank-holo-text rule.
    text: "",
    border: "border-fuchsia-300/70",
    bg: "bg-fuchsia-500/10",
    glow: "drop-shadow-[0_0_18px_rgba(217,70,239,0.7)]",
    textClass: "rank-holo-text",
    flavor: "Holo",
    cardGlow:
      "shadow-[0_0_56px_rgba(217,70,239,0.45),inset_0_0_28px_rgba(217,70,239,0.10)]",
    cardBorder: "border-fuchsia-300/60",
    cornerBorder: "border-fuchsia-200",
    title: "The Sovereign",
    description:
      "The System bends to you. There is nothing left to fight, only the ongoing practice. Hunter and path are the same thing. You walk in your own light.",
  },
};

export function getRankStyle(rank: string): RankStyle {
  return RANK_STYLES[rank] ?? RANK_STYLES.E;
}

/**
 * Resolve localized flavor / title / description for a rank. Falls back
 * to the English defaults baked into RANK_STYLES if the translation
 * key is missing.
 */
export function resolveRankLabels(
  rank: string,
  tRankStyles: (key: string) => string
): { flavor: string; title: string; description: string } {
  const fallback = getRankStyle(rank);
  try {
    return {
      flavor: tRankStyles(`${rank}.flavor`),
      title: tRankStyles(`${rank}.title`),
      description: tRankStyles(`${rank}.description`),
    };
  } catch {
    return {
      flavor: fallback.flavor,
      title: fallback.title,
      description: fallback.description,
    };
  }
}

