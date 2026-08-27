-- 상위탭(RaidGroup) 도입. 기존 카테고리는 소속 그룹이 없어 자동 이관이 불가능하고,
-- 사용자 확인하에 기존 공대표 데이터(카테고리/기수 포함)를 비우고 관리자가 새로 구성하기로 함.
DELETE FROM "RaidTeam";
DELETE FROM "RaidCategory";

-- CreateTable
CREATE TABLE "RaidGroup" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidGroup_label_key" ON "RaidGroup"("label");

-- AlterTable
DROP INDEX "RaidCategory_label_key";
ALTER TABLE "RaidCategory" ADD COLUMN "groupId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RaidCategory_groupId_idx" ON "RaidCategory"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidCategory_groupId_label_key" ON "RaidCategory"("groupId", "label");

-- AddForeignKey
ALTER TABLE "RaidCategory" ADD CONSTRAINT "RaidCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RaidGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
