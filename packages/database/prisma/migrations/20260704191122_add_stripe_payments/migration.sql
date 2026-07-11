/*
  Warnings:

  - A unique constraint covering the columns `[stripeAccountId]` on the table `host_profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('NONE', 'AUTHORIZED', 'RELEASED', 'CAPTURED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('NONE', 'SCHEDULED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "SecurityDepositClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_EXPIRED';

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'STRIPE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CAPTURED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "depositStatus" "DepositStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "hostPayoutAmount" INTEGER,
ADD COLUMN     "paymentLockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "payoutScheduledAt" TIMESTAMP(3),
ADD COLUMN     "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "platformFeeAmount" INTEGER,
ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeDepositPaymentIntentId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT;

-- AlterTable
ALTER TABLE "host_profiles" ADD COLUMN     "platformFeePercent" DECIMAL(5,2),
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "nonRefundablePercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "security_deposit_claims" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SecurityDepositClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "security_deposit_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_deposit_claims_bookingId_key" ON "security_deposit_claims"("bookingId");

-- CreateIndex
CREATE INDEX "security_deposit_claims_status_idx" ON "security_deposit_claims"("status");

-- CreateIndex
CREATE INDEX "bookings_paymentLockExpiresAt_idx" ON "bookings"("paymentLockExpiresAt");

-- CreateIndex
CREATE INDEX "bookings_payoutStatus_idx" ON "bookings"("payoutStatus");

-- CreateIndex
CREATE UNIQUE INDEX "host_profiles_stripeAccountId_key" ON "host_profiles"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "security_deposit_claims" ADD CONSTRAINT "security_deposit_claims_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
