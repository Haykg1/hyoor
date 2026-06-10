-- CreateTable
CREATE TABLE "property_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_favorites_userId_idx" ON "property_favorites"("userId");

-- CreateIndex
CREATE INDEX "property_favorites_propertyId_idx" ON "property_favorites"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_favorites_userId_propertyId_key" ON "property_favorites"("userId", "propertyId");

-- AddForeignKey
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
