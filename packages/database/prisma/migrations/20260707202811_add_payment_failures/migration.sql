-- CreateEnum
CREATE TYPE "PaymentFailureCategory" AS ENUM ('RENT_CAPTURE_FAILED', 'DEPOSIT_RELEASE_FAILED', 'DEPOSIT_CLAIM_TRANSFER_FAILED', 'PAYOUT_TRANSFER_FAILED', 'PAYMENT_LOCK_SWEEP_FAILED', 'CANCELLATION_CAPTURE_FAILED');

-- CreateTable
CREATE TABLE "payment_failures" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "category" "PaymentFailureCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "stripeErrorCode" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_failures_bookingId_idx" ON "payment_failures"("bookingId");

-- CreateIndex
CREATE INDEX "payment_failures_category_idx" ON "payment_failures"("category");

-- CreateIndex
CREATE INDEX "payment_failures_resolved_idx" ON "payment_failures"("resolved");

-- AddForeignKey
ALTER TABLE "payment_failures" ADD CONSTRAINT "payment_failures_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
