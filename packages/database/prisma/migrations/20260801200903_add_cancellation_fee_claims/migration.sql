-- CreateEnum
CREATE TYPE "CancellationFeeClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CANCELLATION_FEE_REVIEW';

-- CreateTable
CREATE TABLE "cancellation_fee_claims" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "CancellationFeeClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "cancellation_fee_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_fee_claims_bookingId_key" ON "cancellation_fee_claims"("bookingId");

-- CreateIndex
CREATE INDEX "cancellation_fee_claims_status_idx" ON "cancellation_fee_claims"("status");

-- AddForeignKey
ALTER TABLE "cancellation_fee_claims" ADD CONSTRAINT "cancellation_fee_claims_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
