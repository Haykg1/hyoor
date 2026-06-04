-- AlterTable
ALTER TABLE "properties" ADD COLUMN "street" TEXT,
ADD COLUMN "buildingNumber" TEXT,
ADD COLUMN "formattedAddress" TEXT,
ADD COLUMN "placeKind" TEXT,
ADD COLUMN "apartmentNumber" TEXT;

-- CreateIndex
CREATE INDEX "properties_region_idx" ON "properties"("region");

-- CreateIndex
CREATE INDEX "properties_street_idx" ON "properties"("street");
