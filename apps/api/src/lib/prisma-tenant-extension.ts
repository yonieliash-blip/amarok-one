import { Prisma } from "@prisma/client";
import { forbidden } from "./errors.js";
import {
  getEffectiveOrganizationId,
  isTenantIsolationBypassed,
  tenantContextRequired,
} from "./tenant-context.js";

const TENANT_SCOPED_MODELS = new Set([
  "Company",
  "Branch",
  "Customer",
  "CustomerContact",
  "EquipmentType",
  "Equipment",
  "ServiceCall",
  "ServiceCallVisit",
  "WorkflowEvent",
  "UserRole",
  "OrganizationMember",
  "MemberModuleAccess",
  "Role",
  "AuditLog",
]);

const GLOBAL_MODELS = new Set(["User", "Permission", "RolePermission", "RefreshToken"]);

const READ_OPERATIONS = new Set(["findMany", "findFirst", "count", "aggregate", "groupBy"]);

const WRITE_WHERE_OPERATIONS = new Set(["update", "updateMany", "delete", "deleteMany"]);

type QueryArgs = Record<string, unknown>;

function mergeWhere(
  where: Record<string, unknown> | undefined,
  filter: Record<string, unknown>,
): Record<string, unknown> {
  if (!where) {
    return { ...filter };
  }

  return { AND: [where, filter] };
}

/** Prisma upsert/update/delete require a top-level unique selector, not AND filters. */
function hasUniqueWhereSelector(where: Record<string, unknown> | undefined): boolean {
  if (!where) {
    return false;
  }

  if (typeof where.id === "string") {
    return true;
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") {
      continue;
    }

    if (isCompoundUniqueWhereEntry(key, value)) {
      return true;
    }
  }

  return false;
}

const FILTER_OPERATOR_KEYS = new Set([
  "equals",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "endsWith",
  "mode",
  "not",
  "AND",
  "OR",
  "every",
  "some",
  "none",
  "is",
  "isNot",
]);

function isCompoundUniqueWhereEntry(key: string, value: unknown): boolean {
  if (!key.includes("_")) {
    return false;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((entryKey) => FILTER_OPERATOR_KEYS.has(entryKey))) {
    return false;
  }

  return true;
}

function assertUniqueWhereTenant(
  where: Record<string, unknown> | undefined,
  organizationId: string,
  model: string,
): void {
  if (typeof where?.organizationId === "string" && where.organizationId !== organizationId) {
    throw forbidden(`Cross-tenant write is not allowed for ${model}`);
  }
}

function applyUniqueTenantWhereScope(
  where: Record<string, unknown>,
  organizationId: string,
  model: string,
): Record<string, unknown> {
  assertUniqueWhereTenant(where, organizationId, model);
  return { ...where, organizationId };
}

function assertOrganizationWhereMatches(
  where: Record<string, unknown> | undefined,
  organizationId: string,
): void {
  if (typeof where?.id === "string" && where.id !== organizationId) {
    throw forbidden("Cross-tenant write is not allowed for Organization");
  }
}

function applyOrganizationReadScope(args: QueryArgs, organizationId: string): QueryArgs {
  const nextArgs = { ...args };
  nextArgs.where = mergeWhere(nextArgs.where as Record<string, unknown> | undefined, {
    id: organizationId,
  });
  return nextArgs;
}

function applyTenantReadScope(args: QueryArgs, organizationId: string): QueryArgs {
  const nextArgs = { ...args };
  nextArgs.where = mergeWhere(nextArgs.where as Record<string, unknown> | undefined, {
    organizationId,
  });
  return nextArgs;
}

function applyTenantWriteWhereScope(
  args: QueryArgs,
  organizationId: string,
  model: string,
): QueryArgs {
  const nextArgs = { ...args };
  const where = nextArgs.where as Record<string, unknown> | undefined;

  if (hasUniqueWhereSelector(where)) {
    nextArgs.where = applyUniqueTenantWhereScope(where ?? {}, organizationId, model);
    return nextArgs;
  }

  nextArgs.where = mergeWhere(where, {
    organizationId,
  });
  return nextArgs;
}

function assertOrganizationIdMatches(value: unknown, organizationId: string, model: string): void {
  if (value === undefined) {
    return;
  }

  if (value !== organizationId) {
    throw forbidden(`Cross-tenant write is not allowed for ${model}`);
  }
}

function applyTenantCreateScope(args: QueryArgs, organizationId: string, model: string): QueryArgs {
  const nextArgs = { ...args };
  const data = (nextArgs.data ?? {}) as Record<string, unknown>;

  assertOrganizationIdMatches(data.organizationId, organizationId, model);
  nextArgs.data = {
    ...data,
    organizationId,
  };

  return nextArgs;
}

function applyTenantCreateManyScope(
  args: QueryArgs,
  organizationId: string,
  model: string,
): QueryArgs {
  const nextArgs = { ...args };
  const data = nextArgs.data;

  if (Array.isArray(data)) {
    nextArgs.data = data.map((entry) => {
      const record = entry as Record<string, unknown>;
      assertOrganizationIdMatches(record.organizationId, organizationId, model);
      return {
        ...record,
        organizationId,
      };
    });
  }

  return nextArgs;
}

function applyTenantUpsertScope(args: QueryArgs, organizationId: string, model: string): QueryArgs {
  const nextArgs = { ...args };
  const where = nextArgs.where as Record<string, unknown> | undefined;

  if (hasUniqueWhereSelector(where)) {
    nextArgs.where = applyUniqueTenantWhereScope(where ?? {}, organizationId, model);
  } else {
    nextArgs.where = mergeWhere(where, { organizationId });
  }

  const create = (nextArgs.create ?? {}) as Record<string, unknown>;
  assertOrganizationIdMatches(create.organizationId, organizationId, model);
  nextArgs.create = {
    ...create,
    organizationId,
  };
  return nextArgs;
}

function scopeQueryArgs(model: string, operation: string, args: QueryArgs): QueryArgs {
  const organizationId = getEffectiveOrganizationId();
  if (!organizationId) {
    throw tenantContextRequired();
  }

  if (model === "Organization") {
    if (READ_OPERATIONS.has(operation)) {
      return applyOrganizationReadScope(args, organizationId);
    }

    if (WRITE_WHERE_OPERATIONS.has(operation)) {
      const nextArgs = { ...args };
      const where = nextArgs.where as Record<string, unknown> | undefined;
      assertOrganizationWhereMatches(where, organizationId);
      nextArgs.where = mergeWhere(where, { id: organizationId });
      return nextArgs;
    }

    if (operation === "upsert") {
      const nextArgs = { ...args };
      const where = nextArgs.where as Record<string, unknown> | undefined;
      if (!hasUniqueWhereSelector(where)) {
        nextArgs.where = mergeWhere(where, {
          id: organizationId,
        });
      } else {
        assertOrganizationWhereMatches(where, organizationId);
      }
      return nextArgs;
    }

    return args;
  }

  if (!TENANT_SCOPED_MODELS.has(model)) {
    return args;
  }

  if (READ_OPERATIONS.has(operation)) {
    return applyTenantReadScope(args, organizationId);
  }

  if (WRITE_WHERE_OPERATIONS.has(operation)) {
    return applyTenantWriteWhereScope(args, organizationId, model);
  }

  if (operation === "create") {
    return applyTenantCreateScope(args, organizationId, model);
  }

  if (operation === "createMany") {
    return applyTenantCreateManyScope(args, organizationId, model);
  }

  if (operation === "upsert") {
    return applyTenantUpsertScope(args, organizationId, model);
  }

  return args;
}

/** @internal Exported for unit tests only. */
export function scopeTenantQueryArgsForTests(
  model: string,
  operation: string,
  args: QueryArgs,
): QueryArgs {
  return scopeQueryArgs(model, operation, args);
}

export function createTenantIsolationExtension() {
  return Prisma.defineExtension({
    name: "tenantIsolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (isTenantIsolationBypassed()) {
            return query(args);
          }

          if (GLOBAL_MODELS.has(model)) {
            return query(args);
          }

          if (model === "Organization" || TENANT_SCOPED_MODELS.has(model)) {
            const scopedArgs = scopeQueryArgs(model, operation, args as QueryArgs);
            return query(scopedArgs);
          }

          return query(args);
        },
      },
    },
  });
}
