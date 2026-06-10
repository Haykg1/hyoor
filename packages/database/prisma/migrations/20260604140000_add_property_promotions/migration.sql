-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('DATE_RANGE', 'PROMO_CODE');

-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROPERTY_PROMOTION';

-- CreateTable
CREATE TABLE "property_promotions" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "discountType" "PromotionDiscountType" NOT NULL,
    "discountPercent" INTEGER,
    "discountAmount" INTEGER,
    "description" TEXT NOT NULL,
    "bookingStartDate" DATE NOT NULL,
    "bookingEndDate" DATE NOT NULL,
    "promoCode" TEXT,
    "maxApplications" INTEGER NOT NULL,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "notifyGuests" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_promotions_propertyId_idx" ON "property_promotions"("propertyId");

-- CreateIndex
CREATE INDEX "property_promotions_isActive_idx" ON "property_promotions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "property_promotions_propertyId_promoCode_key" ON "property_promotions"("propertyId", "promoCode");

-- AddForeignKey
ALTER TABLE "property_promotions" ADD CONSTRAINT "property_promotions_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
