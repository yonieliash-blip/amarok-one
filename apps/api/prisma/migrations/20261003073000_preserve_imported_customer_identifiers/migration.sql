ALTER TABLE "customers" ADD COLUMN "externalCustomerNumber" TEXT;

-- AMAROK's display numbers were already assigned by the prior migration.
-- Preserve the original identifier only for customers imported from Morning,
-- where the source identifier remains in morningClientId.
UPDATE "customers"
SET "externalCustomerNumber" = "morningClientId"
WHERE "deletedAt" IS NULL
  AND "morningClientId" IS NOT NULL;
