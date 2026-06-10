-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN "promotionId" TEXT;

-- CreateIndex
CREATE INDEX "bookings_promotionId_idx" ON "bookings"("promotionId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "property_promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
