CREATE TABLE "organization_number_sequences" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_number_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_number_sequences_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "organization_number_sequences_organizationId_scope_key"
  ON "organization_number_sequences"("organizationId", "scope");
CREATE INDEX "organization_number_sequences_organizationId_idx"
  ON "organization_number_sequences"("organizationId");

WITH numbered_customers AS (
  SELECT
    "id",
    "organizationId",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "sequenceNumber"
  FROM "customers"
  WHERE "deletedAt" IS NULL
)
UPDATE "customers" AS customer
SET "customerNumber" = 'AM-CU-' || LPAD(numbered_customers."sequenceNumber"::TEXT, 2, '0')
FROM numbered_customers
WHERE customer."id" = numbered_customers."id";

INSERT INTO "organization_number_sequences" (
  "id", "organizationId", "scope", "nextValue", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  "organizationId",
  'customer-number',
  COUNT(*)::INTEGER + 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "customers"
WHERE "deletedAt" IS NULL
GROUP BY "organizationId";
