export const FREE_DUNGEON_LIMIT = 2;

export function isPricingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRICING_ENABLED === "true";
}

interface UserLike {
  publicMetadata?: unknown;
}

export function isUserPro(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  const meta = user.publicMetadata as { pro?: boolean } | undefined;
  return meta?.pro === true;
}

export function canActivateDungeon(opts: {
  activeRunCount: number;
  userIsPro: boolean;
}): { allowed: boolean; reason?: "paywall" } {
  if (!isPricingEnabled()) return { allowed: true };
  if (opts.userIsPro) return { allowed: true };
  if (opts.activeRunCount < FREE_DUNGEON_LIMIT) return { allowed: true };
  return { allowed: false, reason: "paywall" };
}