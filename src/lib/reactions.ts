/**
 * Fixed set of emoji a hunter can tap on a public journal entry.
 * Limited to keep the UI compact and the tone consistent, every
 * reaction has an unambiguous "what does this say to the poster"
 * meaning that fits the system's hunter / self-improvement context.
 *
 * Order is the order they render in the picker (left → right).
 */
export const REACTION_EMOJIS = [
  { emoji: "🔥", label: "Fire" },        // crushing it
  { emoji: "💪", label: "Strength" },     // stay strong
  { emoji: "🙏", label: "Respect" },      // I see you
  { emoji: "❤️", label: "Love" },          // I feel this
  { emoji: "✨", label: "Inspiring" },    // wisdom shared
] as const;

export const REACTION_EMOJI_SET: ReadonlySet<string> = new Set(
  REACTION_EMOJIS.map((r) => r.emoji)
);

export interface ReactionSummary {
  emoji: string;
  count: number;
  /** True when the current viewer has tapped this emoji on this entry. */
  userReacted: boolean;
}
