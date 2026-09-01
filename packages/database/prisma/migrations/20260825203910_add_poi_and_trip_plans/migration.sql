-- CreateEnum
CREATE TYPE "PoiStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TripPlanStatus" AS ENUM ('INTERVIEW', 'PLANNED');

-- CreateTable
CREATE TABLE "pois" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AM',
    "citySlug" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nameLabels" JSONB NOT NULL,
    "descriptionLabels" JSONB NOT NULL,
    "wikipediaTitle" TEXT,
    "wikipediaUrl" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "status" "PoiStatus" NOT NULL DEFAULT 'DRAFT',
    "usableInPlanner" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poi_photos" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poi_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "bookingId" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "itinerary" JSONB,
    "status" "TripPlanStatus" NOT NULL DEFAULT 'INTERVIEW',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_plan_messages" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_plan_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pois_citySlug_idx" ON "pois"("citySlug");

-- CreateIndex
CREATE INDEX "pois_status_idx" ON "pois"("status");

-- CreateIndex
CREATE INDEX "pois_category_idx" ON "pois"("category");

-- CreateIndex
CREATE INDEX "pois_usableInPlanner_idx" ON "pois"("usableInPlanner");

-- CreateIndex
CREATE INDEX "pois_citySlug_status_idx" ON "pois"("citySlug", "status");

-- CreateIndex
CREATE INDEX "poi_photos_poiId_idx" ON "poi_photos"("poiId");

-- CreateIndex
CREATE INDEX "trip_plans_userId_idx" ON "trip_plans"("userId");

-- CreateIndex
CREATE INDEX "trip_plans_bookingId_idx" ON "trip_plans"("bookingId");

-- CreateIndex
CREATE INDEX "trip_plans_userId_createdAt_idx" ON "trip_plans"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "trip_plan_messages_planId_idx" ON "trip_plan_messages"("planId");

-- CreateIndex
CREATE INDEX "trip_plan_messages_planId_createdAt_idx" ON "trip_plan_messages"("planId", "createdAt");

-- AddForeignKey
ALTER TABLE "poi_photos" ADD CONSTRAINT "poi_photos_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "pois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plans" ADD CONSTRAINT "trip_plans_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plan_messages" ADD CONSTRAINT "trip_plan_messages_planId_fkey" FOREIGN KEY ("planId") REFERENCES "trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
