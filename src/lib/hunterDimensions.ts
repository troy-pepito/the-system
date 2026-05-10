import type { HunterType } from "@/lib/hunterType";

export interface HunterDimensions {
  body: number;
  mind: number;
  emotion: number;
  energy: number;
  spirit: number;
}

/**
 * Canonical iteration order for the five dimensions. Matches the
 * Hunter Type ids so dominantDimension can return one directly.
 * Ties resolve in this order (body > mind > emotion > energy > spirit),
 * feels less random than alphabetical when two dimensions are equal.
 */
export const DIMENSION_ORDER: ReadonlyArray<HunterType> = [
  "body",
  "mind",
  "emotion",
  "energy",
  "spirit",
];

/**
 * Pick the single dimension with the highest accumulated stat value.
 * Returns null when the hunter has zero progress everywhere (brand-new
 * account), the caller decides whether to show "no dominant yet" or
 * just hide the badge. Used by both the owner Hunter Card and the
 * public /h/{hunterId} card so the Badges row reads identically across
 * surfaces.
 */
export function dominantDimension(
  dims: HunterDimensions | undefined | null
): HunterType | null {
  if (!dims) return null;
  let best: HunterType | null = null;
  let bestScore = 0;
  for (const d of DIMENSION_ORDER) {
    const score = dims[d];
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}
