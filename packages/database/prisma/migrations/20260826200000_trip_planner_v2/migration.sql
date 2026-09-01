-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "dateOfBirth" DATE;

-- ReplaceEnum
CREATE TYPE "TripPlanStatus_new" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED', 'INTERVIEW', 'PLANNED');
ALTER TABLE "trip_plans" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "trip_plans" ALTER COLUMN "status" TYPE "TripPlanStatus_new" USING ("status"::text::"TripPlanStatus_new");
DROP TYPE "TripPlanStatus";
ALTER TYPE "TripPlanStatus_new" RENAME TO "TripPlanStatus";
UPDATE "trip_plans" SET "status" = 'DRAFT' WHERE "status" = 'INTERVIEW';
UPDATE "trip_plans" SET "status" = 'READY' WHERE "status" = 'PLANNED';
ALTER TABLE "trip_plans" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateEnum
CREATE TYPE "TripPlanItemKind" AS ENUM ('sight', 'meal', 'activity', 'transfer', 'rest');

-- CreateEnum
CREATE TYPE "TripPlanVerificationStatus" AS ENUM ('verified', 'adjusted', 'unverified', 'rejected');

-- AlterTable
ALTER TABLE "trip_plans" ADD COLUMN "guestCount" INTEGER,
ADD COLUMN "budgetProfile" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "staySnapshot" JSONB,
ADD COLUMN "summary" TEXT,
ADD COLUMN "rawModelOutput" JSONB;

ALTER TABLE "trip_plans" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "trip_plan_days" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "theme" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trip_plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_plan_items" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "tempId" TEXT,
    "kind" "TripPlanItemKind" NOT NULL,
    "placeId" TEXT,
    "nameLabels" JSONB NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "openingHours" TEXT,
    "pricePerPerson" JSONB,
    "bookingRequired" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "whyThisFits" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "verificationStatus" "TripPlanVerificationStatus" NOT NULL DEFAULT 'unverified',
    "adjustments" JSONB NOT NULL DEFAULT '[]',
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trip_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_plan_verifications" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "checkName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "providerPayload" JSONB,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trip_plan_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_plan_days_planId_idx" ON "trip_plan_days"("planId");
CREATE INDEX "trip_plan_days_planId_date_idx" ON "trip_plan_days"("planId", "date");
CREATE INDEX "trip_plan_items_dayId_idx" ON "trip_plan_items"("dayId");
CREATE INDEX "trip_plan_items_placeId_idx" ON "trip_plan_items"("placeId");
CREATE INDEX "trip_plan_verifications_itemId_idx" ON "trip_plan_verifications"("itemId");

-- AddForeignKey
ALTER TABLE "trip_plan_days" ADD CONSTRAINT "trip_plan_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES "trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_plan_items" ADD CONSTRAINT "trip_plan_items_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "trip_plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_plan_verifications" ADD CONSTRAINT "trip_plan_verifications_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trip_plan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
