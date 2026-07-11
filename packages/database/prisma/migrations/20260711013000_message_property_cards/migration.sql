-- AlterTable
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'PROPERTY_CARD');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "messages" ADD COLUMN "propertyId" TEXT;

-- CreateIndex
CREATE INDEX "messages_propertyId_idx" ON "messages"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_conversationId_propertyId_key" ON "messages"("conversationId", "propertyId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
