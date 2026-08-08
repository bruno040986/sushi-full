-- DropIndex
DROP INDEX "DeliveryZone_name_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "lastCity" TEXT,
ADD COLUMN     "lastState" TEXT;

-- AlterTable
ALTER TABLE "DeliveryZone" ADD COLUMN     "cityId" TEXT NOT NULL,
ADD COLUMN     "freeDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeDeliveryThresholdCents" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "wazeUrl" TEXT;

-- CreateTable
CREATE TABLE "ServiceCity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCity_active_sortOrder_idx" ON "ServiceCity"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCity_name_state_key" ON "ServiceCity"("name", "state");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_name_cityId_key" ON "DeliveryZone"("name", "cityId");

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ServiceCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

