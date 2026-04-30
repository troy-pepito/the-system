-- Reactions: a hunter taps an emoji on someone's public journal entry.
-- Unique on (eventId, userId, emoji) so the same emoji from the same
-- hunter is a toggle rather than stacking.

CREATE TABLE "Reaction" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Reaction_eventId_userId_emoji_key" ON "Reaction"("eventId", "userId", "emoji");

CREATE INDEX "Reaction_eventId_idx" ON "Reaction"("eventId");

ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DungeonEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
