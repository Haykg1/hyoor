-- CreateEnum
CREATE TYPE "StayFeeRulesMode" AS ENUM ('SIMPLE', 'RULES');

-- CreateEnum
CREATE TYPE "StayFeeDepositType" AS ENUM ('FIXED', 'PERCENT');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "stayFeeRulesMode" "StayFeeRulesMode" NOT NULL DEFAULT 'SIMPLE';

-- CreateTable
CREATE TABLE "property_stay_fee_rules" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "dateFrom" DATE,
    "dateTo" DATE,
    "minNights" INTEGER NOT NULL,
    "maxNights" INTEGER,
    "cleaningFee" INTEGER NOT NULL DEFAULT 0,
    "depositType" "StayFeeDepositType" NOT NULL DEFAULT 'FIXED',
    "depositValue" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_stay_fee_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_stay_fee_rules_propertyId_idx" ON "property_stay_fee_rules"("propertyId");

-- AddForeignKey
ALTER TABLE "property_stay_fee_rules" ADD CONSTRAINT "property_stay_fee_rules_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one year-round catch-all rule per property from legacy columns
INSERT INTO "property_stay_fee_rules" (
    "id",
    "propertyId",
    "dateFrom",
    "dateTo",
    "minNights",
    "maxNights",
    "cleaningFee",
    "depositType",
    "depositValue",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    p.id,
    NULL,
    NULL,
    1,
    NULL,
    p."cleaningFee",
    'FIXED'::"StayFeeDepositType",
    p."securityDeposit",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "properties" p
WHERE NOT EXISTS (
    SELECT 1 FROM "property_stay_fee_rules" r WHERE r."propertyId" = p.id
);

-- Drop legacy fee columns
ALTER TABLE "properties" DROP COLUMN "cleaningFee";
ALTER TABLE "properties" DROP COLUMN "securityDeposit";
