-- CreateEnum
CREATE TYPE "CancellationFeeType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable: add new fee columns
ALTER TABLE "properties" ADD COLUMN "cancellationFeeType" "CancellationFeeType" NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "properties" ADD COLUMN "cancellationFeeValue" INTEGER NOT NULL DEFAULT 0;

-- Migrate nonRefundablePercent → PERCENT + value (clamp to 50 when guest cancel is allowed)
UPDATE "properties"
SET "cancellationFeeType" = 'PERCENT',
    "cancellationFeeValue" = CASE
      WHEN "cancellationPolicy" = 'NON_REFUNDABLE' THEN 100
      WHEN "nonRefundablePercent" > 50 THEN 50
      ELSE "nonRefundablePercent"
    END;

-- Drop old column
ALTER TABLE "properties" DROP COLUMN "nonRefundablePercent";
