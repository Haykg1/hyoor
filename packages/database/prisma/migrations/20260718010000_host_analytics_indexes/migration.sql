-- CreateIndex
CREATE INDEX "bookings_propertyId_checkIn_idx" ON "bookings"("propertyId", "checkIn");

-- CreateIndex
CREATE INDEX "bookings_checkIn_status_idx" ON "bookings"("checkIn", "status");

-- CreateIndex
CREATE INDEX "properties_hostId_status_idx" ON "properties"("hostId", "status");
