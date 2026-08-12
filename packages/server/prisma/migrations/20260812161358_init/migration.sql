-- CreateEnum
CREATE TYPE "ServerId" AS ENUM ('anton', 'bakal', 'cain', 'casillas', 'diregie', 'hilder', 'prey', 'siroco');

-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('DEALER', 'BUFFER');

-- CreateEnum
CREATE TYPE "LogActionType" AS ENUM ('LOGIN', 'CHARACTER_CREATE', 'CHARACTER_UPDATE', 'CHARACTER_DELETE', 'CHARACTER_REORDER', 'RAID_TEAM_SAVE', 'RAID_CATEGORY_CREATE', 'RAID_CATEGORY_UPDATE', 'RAID_CATEGORY_DELETE', 'RAID_TEAM_CREATE', 'RAID_TEAM_DELETE');

-- CreateEnum
CREATE TYPE "LogResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "Adventure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serverId" "ServerId",
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Adventure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "role" "CharacterRole" NOT NULL,
    "score" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "officialCharacterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPartyTemplate" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colorHex" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CategoryPartyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidTeam" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "generationLabel" TEXT NOT NULL,
    "generationIndex" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidTeamParty" (
    "id" TEXT NOT NULL,
    "raidTeamId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colorHex" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RaidTeamParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSlot" (
    "id" TEXT NOT NULL,
    "raidTeamId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "slotInParty" INTEGER NOT NULL,
    "characterId" TEXT,

    CONSTRAINT "RaidSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "actorAdventureId" TEXT,
    "actorNameSnapshot" TEXT NOT NULL,
    "actionType" "LogActionType" NOT NULL,
    "result" "LogResult" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "clientTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Adventure_name_key" ON "Adventure"("name");

-- CreateIndex
CREATE INDEX "Adventure_serverId_idx" ON "Adventure"("serverId");

-- CreateIndex
CREATE INDEX "Character_adventureId_idx" ON "Character"("adventureId");

-- CreateIndex
CREATE INDEX "Character_adventureId_order_idx" ON "Character"("adventureId", "order");

-- CreateIndex
CREATE INDEX "Session_adventureId_idx" ON "Session"("adventureId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaidCategory_label_key" ON "RaidCategory"("label");

-- CreateIndex
CREATE INDEX "CategoryPartyTemplate_categoryId_idx" ON "CategoryPartyTemplate"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPartyTemplate_categoryId_order_key" ON "CategoryPartyTemplate"("categoryId", "order");

-- CreateIndex
CREATE INDEX "RaidTeam_categoryId_idx" ON "RaidTeam"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidTeam_categoryId_generationIndex_key" ON "RaidTeam"("categoryId", "generationIndex");

-- CreateIndex
CREATE INDEX "RaidTeamParty_raidTeamId_idx" ON "RaidTeamParty"("raidTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidTeamParty_raidTeamId_order_key" ON "RaidTeamParty"("raidTeamId", "order");

-- CreateIndex
CREATE INDEX "RaidSlot_raidTeamId_idx" ON "RaidSlot"("raidTeamId");

-- CreateIndex
CREATE INDEX "RaidSlot_characterId_idx" ON "RaidSlot"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidSlot_partyId_slotInParty_key" ON "RaidSlot"("partyId", "slotInParty");

-- CreateIndex
CREATE INDEX "ActionLog_actorAdventureId_idx" ON "ActionLog"("actorAdventureId");

-- CreateIndex
CREATE INDEX "ActionLog_actionType_idx" ON "ActionLog"("actionType");

-- CreateIndex
CREATE INDEX "ActionLog_createdAt_idx" ON "ActionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPartyTemplate" ADD CONSTRAINT "CategoryPartyTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RaidCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidTeam" ADD CONSTRAINT "RaidTeam_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RaidCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidTeamParty" ADD CONSTRAINT "RaidTeamParty_raidTeamId_fkey" FOREIGN KEY ("raidTeamId") REFERENCES "RaidTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSlot" ADD CONSTRAINT "RaidSlot_raidTeamId_fkey" FOREIGN KEY ("raidTeamId") REFERENCES "RaidTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSlot" ADD CONSTRAINT "RaidSlot_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "RaidTeamParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSlot" ADD CONSTRAINT "RaidSlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_actorAdventureId_fkey" FOREIGN KEY ("actorAdventureId") REFERENCES "Adventure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
