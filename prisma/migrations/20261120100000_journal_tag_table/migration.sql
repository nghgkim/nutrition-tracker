CREATE TABLE IF NOT EXISTS "JournalTag" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  CONSTRAINT "JournalTag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JournalTag_entryId_tag_key" ON "JournalTag"("entryId", "tag");
CREATE INDEX IF NOT EXISTS "JournalTag_tag_idx" ON "JournalTag"("tag");
ALTER TABLE "JournalTag" ADD CONSTRAINT "JournalTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Backfill existing JSON tags into queryable rows (idempotent: skip duplicates).
INSERT INTO "JournalTag" ("id", "entryId", "tag")
SELECT 'jt_' || md5(e."id" || ':' || t.value), e."id", t.value
FROM "JournalEntry" e,
     jsonb_array_elements_text(CASE WHEN e."tags" IS NULL OR e."tags" = '' THEN '[]'::jsonb ELSE e."tags"::jsonb END) t
ON CONFLICT ("entryId", "tag") DO NOTHING;
