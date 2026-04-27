-- CreateTable
CREATE TABLE "DungeonDayCheckIn" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "dungeonId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "state" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DungeonDayCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DungeonDayCheckIn_userId_dungeonId_date_idx" ON "DungeonDayCheckIn"("userId", "dungeonId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DungeonDayCheckIn_runId_date_key" ON "DungeonDayCheckIn"("runId", "date");

-- AddForeignKey
ALTER TABLE "DungeonDayCheckIn" ADD CONSTRAINT "DungeonDayCheckIn_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DungeonRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
