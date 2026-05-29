-- CreateIndex
CREATE INDEX "Lease_startDate_idx" ON "Lease"("startDate");

-- CreateIndex
CREATE INDEX "Lease_endDate_idx" ON "Lease"("endDate");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_reportedAt_idx" ON "MaintenanceTicket"("reportedAt");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_propertyId_status_idx" ON "MaintenanceTicket"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Property_ownerId_createdAt_idx" ON "Property"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Tenant_ownerId_lastName_firstName_idx" ON "Tenant"("ownerId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Transaction_unitId_idx" ON "Transaction"("unitId");

-- CreateIndex
CREATE INDEX "Transaction_leaseId_idx" ON "Transaction"("leaseId");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_date_idx" ON "Transaction"("propertyId", "date");
