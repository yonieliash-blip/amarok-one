-- Sprint 2: Customers module

CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT');

CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "customerNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_organizationId_customerNumber_key" ON "customers"("organizationId", "customerNumber");
CREATE INDEX "customers_organizationId_idx" ON "customers"("organizationId");
CREATE INDEX "customers_organizationId_deletedAt_idx" ON "customers"("organizationId", "deletedAt");
CREATE INDEX "customers_organizationId_status_idx" ON "customers"("organizationId", "status");

CREATE INDEX "customer_contacts_organizationId_idx" ON "customer_contacts"("organizationId");
CREATE INDEX "customer_contacts_customerId_idx" ON "customer_contacts"("customerId");
CREATE INDEX "customer_contacts_customerId_deletedAt_idx" ON "customer_contacts"("customerId", "deletedAt");

ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
