-- Additive, tenant-scoped management content. No existing customer, equipment or call data changes.
CREATE TABLE "inspiration_quotes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspiration_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_inspiration_messages" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_inspiration_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inspiration_quotes_organizationId_isActive_idx"
  ON "inspiration_quotes"("organizationId", "isActive");
CREATE INDEX "inspiration_quotes_organizationId_createdAt_idx"
  ON "inspiration_quotes"("organizationId", "createdAt");
CREATE UNIQUE INDEX "employee_inspiration_messages_organizationId_userId_key"
  ON "employee_inspiration_messages"("organizationId", "userId");
CREATE INDEX "employee_inspiration_messages_organizationId_isActive_idx"
  ON "employee_inspiration_messages"("organizationId", "isActive");

ALTER TABLE "inspiration_quotes"
  ADD CONSTRAINT "inspiration_quotes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_inspiration_messages"
  ADD CONSTRAINT "employee_inspiration_messages_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_inspiration_messages"
  ADD CONSTRAINT "employee_inspiration_messages_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
