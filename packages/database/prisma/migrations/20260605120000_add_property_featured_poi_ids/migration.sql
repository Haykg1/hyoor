-- AlterTable
ALTER TABLE "properties" ADD COLUMN "featuredPoiIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
