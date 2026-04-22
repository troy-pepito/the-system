-- CreateTable
CREATE TABLE "EmailSent" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSent_userId_type_sentAt_idx" ON "EmailSent"("userId", "type", "sentAt");