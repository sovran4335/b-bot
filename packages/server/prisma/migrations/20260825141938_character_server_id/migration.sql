-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "serverId" "ServerId";

-- 기존 캐릭터는 소속 모험단의 현재 serverId를 스냅샷으로 백필 (모험단 serverId가 null이면 그대로 null)
UPDATE "Character" c
SET "serverId" = a."serverId"
FROM "Adventure" a
WHERE a."id" = c."adventureId" AND a."serverId" IS NOT NULL;
