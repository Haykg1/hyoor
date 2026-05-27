-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "properties_featured_idx" ON "properties"("featured");
