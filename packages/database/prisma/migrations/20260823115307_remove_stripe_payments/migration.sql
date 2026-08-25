-- Data fixups (must run before enum/table drops below, since existing rows may
-- reference values/tables this migration removes)
UPDATE "bookings" SET "paymentProvider" = NULL WHERE "paymentProvider" = 'STRIPE';
DELETE FROM "notifications" WHERE "type" IN ('PAYOUT_SENT', 'DEPOSIT_CLAIM_SUBMITTED', 'DEPOSIT_CLAIM_RESOLVED', 'DEPOSIT_RELEASED', 'CANCELLATION_FEE_REVIEW');
DELETE FROM "payment_failures" WHERE "category" NOT IN ('PAYMENT_LOCK_SWEEP_FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'NEW_MESSAGE', 'NEW_REVIEW', 'PROPERTY_PROMOTION');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentFailureCategory_new" AS ENUM ('PAYMENT_LOCK_SWEEP_FAILED');
ALTER TABLE "payment_failures" ALTER COLUMN "category" TYPE "PaymentFailureCategory_new" USING ("category"::text::"PaymentFailureCategory_new");
ALTER TYPE "PaymentFailureCategory" RENAME TO "PaymentFailureCategory_old";
ALTER TYPE "PaymentFailureCategory_new" RENAME TO "PaymentFailureCategory";
DROP TYPE "PaymentFailureCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('IDRAM', 'ARCA', 'CASH');
ALTER TABLE "bookings" ALTER COLUMN "paymentProvider" TYPE "PaymentProvider_new" USING ("paymentProvider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "cancellation_fee_claims" DROP CONSTRAINT "cancellation_fee_claims_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "security_deposit_claims" DROP CONSTRAINT "security_deposit_claims_bookingId_fkey";

-- DropIndex
DROP INDEX "bookings_payoutStatus_idx";

-- DropIndex
DROP INDEX "host_profiles_stripeAccountId_key";

-- DropIndex
DROP INDEX "users_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "depositStatus",
DROP COLUMN "payoutScheduledAt",
DROP COLUMN "payoutStatus",
DROP COLUMN "stripeDepositPaymentIntentId",
DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeTransferId";

-- AlterTable
ALTER TABLE "host_profiles" DROP COLUMN "stripeAccountId",
DROP COLUMN "stripeChargesEnabled",
DROP COLUMN "stripeDetailsSubmitted",
DROP COLUMN "stripePayoutsEnabled";

-- AlterTable
ALTER TABLE "payment_failures" DROP COLUMN "stripeErrorCode";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripeCustomerId";

-- DropTable
DROP TABLE "cancellation_fee_claims";

-- DropTable
DROP TABLE "security_deposit_claims";

-- DropEnum
DROP TYPE "CancellationFeeClaimStatus";

-- DropEnum
DROP TYPE "DepositStatus";

-- DropEnum
DROP TYPE "PayoutStatus";

-- DropEnum
DROP TYPE "SecurityDepositClaimStatus";
