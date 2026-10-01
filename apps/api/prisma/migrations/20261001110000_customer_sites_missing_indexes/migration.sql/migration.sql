-- Repair the two Customer Site indexes that are present in the Prisma schema
-- but were not created by the original Customer Site migration in Staging.
CREATE UNIQUE INDEX "customer_sites_customerId_name_active_key"
    ON "customer_sites"("customerId", "name")
    WHERE "deletedAt" IS NULL;
CREATE INDEX "customer_contacts_customerSiteId_idx"
    ON "customer_contacts"("customerSiteId");
