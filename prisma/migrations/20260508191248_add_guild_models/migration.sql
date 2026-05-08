-- CreateTable
CREATE TABLE "Guild" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" SERIAL NOT NULL,
    "guildId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_slug_key" ON "Guild"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE INDEX "Guild_ownerId_idx" ON "Guild"("ownerId");

-- CreateIndex
CREATE INDEX "GuildMember_userId_idx" ON "GuildMember"("userId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_status_idx" ON "GuildMember"("guildId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_guildId_userId_key" ON "GuildMember"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
