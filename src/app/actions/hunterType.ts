"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isHunterType, type HunterType } from "@/lib/hunterType";

/**
 * Reads the caller's hunter type from Clerk metadata. Returns null
 * when the player hasn't picked one yet (the "Unaffiliated" state).
 */
export async function getHunterType(): Promise<HunterType | null> {
  const userId = await requireUserId();
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.unsafeMetadata as { hunterType?: unknown } | undefined;
  if (typeof meta?.hunterType === "string" && isHunterType(meta.hunterType)) {
    return meta.hunterType;
  }
  return null;
}

/**
 * Sets (or unsets) the caller's hunter type. Stored on Clerk
 * unsafeMetadata so it travels with the user record and survives
 * Postgres branch swaps. Pass null to revert to Unaffiliated.
 */
export async function setHunterType(
  type: HunterType | null
): Promise<HunterType | null> {
  const userId = await requireUserId();
  if (type !== null && !isHunterType(type)) {
    throw new Error("Unknown hunter type");
  }
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existing = (user.unsafeMetadata as Record<string, unknown>) ?? {};
  await client.users.updateUser(userId, {
    unsafeMetadata: {
      ...existing,
      hunterType: type,
    },
  });
  // Refresh anywhere that renders the type — hunter card on profile,
  // public profile, future training-program-aware portal listings.
  revalidatePath("/", "layout");
  return type;
}
