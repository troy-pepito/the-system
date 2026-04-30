-- A check-in is conceptually a fact about (user, dungeon, calendar day),
-- but the original schema scoped its uniqueness to (runId, date). That
-- meant exiting a dungeon and re-entering it produced a fresh runId,
-- which let users (and bugs) create a second check-in for the same
-- calendar day in a different runId — every duplicate row counted as a
-- separate cleared day in the snapshot, doubling XP.
--
-- This migration:
--   1) Dedupes existing duplicate rows, keeping the most recent
--      (highest id, which correlates with confirmedAt).
--   2) Drops the old (runId, date) unique constraint.
--   3) Drops the redundant non-unique (userId, dungeonId, date) index
--      since the new unique below covers the same columns.
--   4) Adds a new unique on (userId, dungeonId, date) so the database
--      itself enforces the one-row-per-user-day rule.

DELETE FROM "DungeonDayCheckIn" a
USING "DungeonDayCheckIn" b
WHERE a."userId" = b."userId"
  AND a."dungeonId" = b."dungeonId"
  AND a."date" = b."date"
  AND a."id" < b."id";

DROP INDEX "DungeonDayCheckIn_runId_date_key";

DROP INDEX "DungeonDayCheckIn_userId_dungeonId_date_idx";

CREATE UNIQUE INDEX "DungeonDayCheckIn_userId_dungeonId_date_key"
ON "DungeonDayCheckIn"("userId", "dungeonId", "date");
