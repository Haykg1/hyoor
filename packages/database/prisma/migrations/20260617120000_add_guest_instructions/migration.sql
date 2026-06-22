-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "guestInstructionsSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "guestInstructions" TEXT;
