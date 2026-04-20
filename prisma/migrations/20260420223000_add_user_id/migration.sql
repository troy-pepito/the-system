-- Add nullable userId columns
ALTER TABLE "DungeonRun" ADD COLUMN "userId" TEXT;
ALTER TABLE "QuestCompletion" ADD COLUMN "userId" TEXT;
ALTER TABLE "Achievement" ADD COLUMN "userId" TEXT;

-- Backfill existing rows with Troy's userId
UPDATE "DungeonRun" SET "userId" = 'user_3CdIzOSyb31SM4kvCkxhkJmTJaw' WHERE "userId" IS NULL;
UPDATE "QuestCompletion" SET "userId" = 'user_3CdIzOSyb31SM4kvCkxhkJmTJaw' WHERE "userId" IS NULL;
UPDATE "Achievement" SET "userId" = 'user_3CdIzOSyb31SM4kvCkxhkJmTJaw' WHERE "userId" IS NULL;

-- Tighten to NOT NULL
ALTER TABLE "DungeonRun" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "QuestCompletion" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Achievement" ALTER COLUMN "userId" SET NOT NULL;

-- Swap unique constraints to be user-scoped
DROP INDEX "QuestCompletion_questId_date_key";
CREATE UNIQUE INDEX "QuestCompletion_userId_questId_date_key" ON "QuestCompletion"("userId", "questId", "date");
DROP INDEX "Achievement_achievementId_key";
CREATE UNIQUE INDEX "Achievement_userId_achievementId_key" ON "Achievement"("userId", "achievementId");

-- Lookup index for DungeonRun
CREATE INDEX "DungeonRun_userId_dungeonId_active_idx" ON "DungeonRun"("userId", "dungeonId", "active");