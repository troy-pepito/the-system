/**
 * Resolve a Clerk user record to the public-facing hunter name +
 * avatar pair. Falls through:
 *   unsafeMetadata.hunterName → firstName → username → email-prefix →
 *   "Hunter"
 *
 * Centralized so feed.ts, friends.ts, leaderboard rows, and the public
 * /h/[hunterId] page all surface the same display name without each
 * one re-implementing the fallback chain (and each one drifting).
 */
export interface HunterDisplay {
  hunterName: string;
  imageUrl: string | null;
}

interface ClerkUserLike {
  id: string;
  unsafeMetadata: unknown;
  firstName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  imageUrl?: string | null;
}

export function resolveHunterDisplay(user: ClerkUserLike): HunterDisplay {
  const meta = user.unsafeMetadata as { hunterName?: string } | undefined;
  const hunterName =
    meta?.hunterName ||
    user.firstName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Hunter";
  return { hunterName, imageUrl: user.imageUrl ?? null };
}
