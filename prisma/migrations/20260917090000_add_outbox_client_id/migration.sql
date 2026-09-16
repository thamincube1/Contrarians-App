-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTicket_clientId_key" ON "MaintenanceTicket"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_clientId_key" ON "Inspection"("clientId");
