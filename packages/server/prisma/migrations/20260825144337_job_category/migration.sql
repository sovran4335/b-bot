-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "jobId" TEXT;

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_jobId_idx" ON "Character"("jobId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 던파 공식 API 직업 대분류 시딩 (packages/web/lib/jobCategories.ts 와 값 동일하게 유지)
INSERT INTO "Job" ("id", "name") VALUES
  ('41f1cdc2ff58bb5fdc287be0db2a8df3', '귀검사(남)'),
  ('a7a059ebe9e6054c0644b40ef316d6e9', '격투가(여)'),
  ('afdf3b989339de478e85b614d274d1ef', '거너(남)'),
  ('3909d0b188e9c95311399f776e331da5', '마법사(여)'),
  ('f6a4ad30555b99b499c07835f87ce522', '프리스트(남)'),
  ('944b9aab492c15a8474f96947ceeb9e4', '거너(여)'),
  ('ddc49e9ad1ff72a00b53c6cff5b1e920', '도적'),
  ('ca0f0e0e9e1d55b5f9955b03d9dd213c', '격투가(남)'),
  ('a5ccbaf5538981c6ef99b236c0a60b73', '마법사(남)'),
  ('17e417b31686389eebff6d754c3401ea', '다크나이트'),
  ('b522a95d819a5559b775deb9a490e49a', '크리에이터'),
  ('1645c45aabb008c98406b3a16447040d', '귀검사(여)'),
  ('0ee8fa5dc525c1a1f23fc6911e921e4a', '나이트'),
  ('3deb7be5f01953ac8b1ecaa1e25e0420', '마창사'),
  ('0c1b401bb09241570d364420b3ba3fd7', '프리스트(여)'),
  ('986c2b3d72ee0e4a0b7fcfbe786d4e02', '총검사'),
  ('b9cb48777665de22c006fabaf9a560b3', '아처'),
  ('8d4d2001cdb357e41633c234eb7501b5', '제국기사')
ON CONFLICT ("id") DO NOTHING;
