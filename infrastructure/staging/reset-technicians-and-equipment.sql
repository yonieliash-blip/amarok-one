BEGIN;

SELECT
  'preflight' AS checkpoint,
  (SELECT count(*) FROM "organization_members" AS member
    INNER JOIN "roles" AS role ON role.id = member."primaryRoleId"
    WHERE member."deletedAt" IS NULL
      AND member."isOrganizationOwner" = false
      AND role.slug = 'technician'
      AND role."deletedAt" IS NULL) AS active_technicians,
  (SELECT count(*) FROM "equipment" WHERE "deletedAt" IS NULL) AS active_equipment,
  (SELECT count(*) FROM "customers" WHERE "deletedAt" IS NULL) AS active_customers;

UPDATE "organization_members" AS member
SET "deletedAt" = CURRENT_TIMESTAMP
FROM "roles" AS role
WHERE role.id = member."primaryRoleId"
  AND member."deletedAt" IS NULL
  AND member."isOrganizationOwner" = false
  AND role.slug = 'technician'
  AND role."deletedAt" IS NULL;

UPDATE "equipment"
SET "deletedAt" = CURRENT_TIMESTAMP
WHERE "deletedAt" IS NULL;

SELECT
  'verification' AS checkpoint,
  (SELECT count(*) FROM "organization_members" AS member
    INNER JOIN "roles" AS role ON role.id = member."primaryRoleId"
    WHERE member."deletedAt" IS NULL
      AND member."isOrganizationOwner" = false
      AND role.slug = 'technician'
      AND role."deletedAt" IS NULL) AS active_technicians,
  (SELECT count(*) FROM "equipment" WHERE "deletedAt" IS NULL) AS active_equipment,
  (SELECT count(*) FROM "customers" WHERE "deletedAt" IS NULL) AS active_customers;

COMMIT;
