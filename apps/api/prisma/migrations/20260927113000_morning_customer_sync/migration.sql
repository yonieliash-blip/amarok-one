ALTER TABLE "customers"
  ADD COLUMN "morningClientId" TEXT,
  ADD COLUMN "morningLastSyncedAt" TIMESTAMP(3);

ALTER TABLE "customer_contacts"
  ADD COLUMN "morningSourceKey" TEXT;

CREATE UNIQUE INDEX "customers_organizationId_morningClientId_key"
  ON "customers"("organizationId", "morningClientId");

CREATE UNIQUE INDEX "customer_contacts_customerId_morningSourceKey_key"
  ON "customer_contacts"("customerId", "morningSourceKey");
