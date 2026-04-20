/*
  Warnings:

  - You are about to drop the `Player` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Player";

-- CreateTable
CREATE TABLE "DungeonRun" (
    "id" SERIAL NOT NULL,
    "dungeonId" TEXT NOT NULL,
    "startDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DungeonRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DungeonEvent" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DungeonEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DungeonEvent" ADD CONSTRAINT "DungeonEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DungeonRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
