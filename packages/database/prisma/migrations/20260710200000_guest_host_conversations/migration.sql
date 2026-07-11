-- AlterTable: add guest/host columns (nullable for backfill)
ALTER TABLE "conversations" ADD COLUMN "guestId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "hostUserId" TEXT;

-- Backfill from booking → property → host
UPDATE "conversations" AS c
SET
  "guestId" = b."guestId",
  "hostUserId" = hp."userId"
FROM "bookings" AS b
JOIN "properties" AS p ON p."id" = b."propertyId"
JOIN "host_profiles" AS hp ON hp."id" = p."hostId"
WHERE c."bookingId" = b."id";

-- Merge duplicate guest+host conversations: move messages to oldest, delete extras
WITH ranked AS (
  SELECT
    id,
    "guestId",
    "hostUserId",
    ROW_NUMBER() OVER (
      PARTITION BY "guestId", "hostUserId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "conversations"
  WHERE "guestId" IS NOT NULL AND "hostUserId" IS NOT NULL
),
dupes AS (
  SELECT r.id AS dupe_id, keep.id AS keep_id
  FROM ranked r
  JOIN ranked keep
    ON keep."guestId" = r."guestId"
   AND keep."hostUserId" = r."hostUserId"
   AND keep.rn = 1
  WHERE r.rn > 1
)
UPDATE "messages" AS m
SET "conversationId" = d.keep_id
FROM dupes d
WHERE m."conversationId" = d.dupe_id;

WITH ranked AS (
  SELECT
    id,
    "guestId",
    "hostUserId",
    ROW_NUMBER() OVER (
      PARTITION BY "guestId", "hostUserId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "conversations"
  WHERE "guestId" IS NOT NULL AND "hostUserId" IS NOT NULL
)
DELETE FROM "conversations"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop rows that could not be backfilled (orphan safety)
DELETE FROM "conversations" WHERE "guestId" IS NULL OR "hostUserId" IS NULL;

-- Drop booking FK and column
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_bookingId_fkey";
DROP INDEX IF EXISTS "conversations_bookingId_key";
ALTER TABLE "conversations" DROP COLUMN "bookingId";

-- Enforce NOT NULL + unique + indexes + FKs
ALTER TABLE "conversations" ALTER COLUMN "guestId" SET NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "hostUserId" SET NOT NULL;

CREATE UNIQUE INDEX "conversations_guestId_hostUserId_key" ON "conversations"("guestId", "hostUserId");
CREATE INDEX "conversations_guestId_idx" ON "conversations"("guestId");
CREATE INDEX "conversations_hostUserId_idx" ON "conversations"("hostUserId");
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
