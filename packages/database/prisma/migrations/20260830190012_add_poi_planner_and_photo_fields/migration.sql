-- CreateEnum
CREATE TYPE "PoiPhotoStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "poi_photos" ADD COLUMN     "attribution" TEXT,
ADD COLUMN     "license" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "status" "PoiPhotoStatus" NOT NULL DEFAULT 'PENDING_REVIEW';

-- Existing POI photos were uploaded by admins before the review step existed.
UPDATE "poi_photos" SET "status" = 'APPROVED', "reviewedAt" = "createdAt";

-- AlterTable
ALTER TABLE "pois" ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "poi_photos_poiId_status_idx" ON "poi_photos"("poiId", "status");

-- CreateIndex
CREATE INDEX "pois_citySlug_status_usableInPlanner_idx" ON "pois"("citySlug", "status", "usableInPlanner");

-- CreateIndex
CREATE INDEX "pois_tags_idx" ON "pois" USING GIN ("tags");
