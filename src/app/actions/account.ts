"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

/**
 * Permanently delete the viewer's account. Hard delete — no recovery.
 *
 * Order matters:
 *  1. Disband any guilds the viewer owns (cascade clears their members)
 *  2. Wipe local DB rows for this userId across every table that holds
 *     personal data
 *  3. Delete the Clerk user record (this also signs them out)
 *
 * Steps 1+2 happen in a transaction so a partial failure doesn't leave
 * orphan rows. Clerk deletion runs after — if it fails, the next call
 * to a Clerk-aware action will surface a "user not found" and the user
 * can be force-signed-out client-side.
 *
 * Side effect: any guild the viewer owns gets disbanded as a
 * consequence — surfaced in the UI confirmation copy so it's not a
 * surprise.
 */
export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();

  await prisma.$transaction([
    // Owned guilds first. Guild → GuildMember has onDelete: Cascade,
    // so this single delete sweeps the membership rows for every
    // member of every guild the viewer owns.
    prisma.guild.deleteMany({ where: { ownerId: userId } }),
    // Viewer's own membership in any guild they're a member of (not
    // owner). The `accepted` and `pending` rows both get cleaned up
    // since the where clause is just { userId }.
    prisma.guildMember.deleteMany({ where: { userId } }),
    // Friendships in either direction — viewer is requester or
    // addressee.
    prisma.friendship.deleteMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    }),
    // Reactions the viewer left on other hunters' events. The
    // reverse direction (other hunters' reactions on the viewer's
    // events) is handled implicitly when DungeonRun is deleted —
    // DungeonEvent has onDelete: Cascade on runId, and Reaction has
    // onDelete: Cascade on eventId.
    prisma.reaction.deleteMany({ where: { userId } }),
    // DungeonRun cascades to DungeonEvent + DungeonDayCheckIn via FK.
    // The two deleteMany lines below are belt-and-suspenders for any
    // orphan check-ins / events whose runId points at a different
    // user (shouldn't happen, but cheap to guard against).
    prisma.dungeonRun.deleteMany({ where: { userId } }),
    prisma.dungeonDayCheckIn.deleteMany({ where: { userId } }),
    // Personal records that have a direct userId column.
    prisma.questCompletion.deleteMany({ where: { userId } }),
    prisma.achievement.deleteMany({ where: { userId } }),
    prisma.emailSent.deleteMany({ where: { userId } }),
    prisma.pushSubscription.deleteMany({ where: { userId } }),
  ]);

  // Clerk lives in a separate service — runs outside the transaction.
  // If this throws, the local DB is already wiped; the orphan Clerk
  // record is harmless and a manual cleanup or the next sign-in can
  // resolve it.
  const client = await clerkClient();
  await client.users.deleteUser(userId);
}
