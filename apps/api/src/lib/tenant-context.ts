import { AsyncLocalStorage } from "node:async_hooks";
import { AppError } from "./errors.js";

export interface TenantContextState {
  organizationId: string | null;
  bypassTenantIsolation: boolean;
}

const tenantContextStorage = new AsyncLocalStorage<TenantContextState>();

export function getTenantContext(): TenantContextState | undefined {
  return tenantContextStorage.getStore();
}

export function isTenantIsolationBypassed(): boolean {
  return tenantContextStorage.getStore()?.bypassTenantIsolation ?? false;
}

export function getEffectiveOrganizationId(): string | null {
  const store = tenantContextStorage.getStore();
  if (!store || store.bypassTenantIsolation) {
    return null;
  }
  return store.organizationId;
}

/** Run a request handler with tenant scope derived from the authenticated organization. */
export function runWithTenantContext<T>(
  context: { organizationId: string },
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return tenantContextStorage.run(
    { organizationId: context.organizationId, bypassTenantIsolation: false },
    fn,
  );
}

/** Disable tenant isolation for trusted operations (auth bootstrap, seed, health diagnostics). */
export function runWithoutTenantIsolation<T>(fn: () => T | Promise<T>): T | Promise<T> {
  return tenantContextStorage.run({ organizationId: null, bypassTenantIsolation: true }, fn);
}

/** Disable tenant isolation while preserving the current organization scope when present. */
export function runWithBypassTenantIsolation<T>(fn: () => T | Promise<T>): T | Promise<T> {
  const parent = tenantContextStorage.getStore();
  return tenantContextStorage.run(
    {
      organizationId: parent?.organizationId ?? null,
      bypassTenantIsolation: true,
    },
    fn,
  );
}

/** Override the effective tenant organization for the current request (platform admin cross-tenant access). */
export function setRequestTenantOrganizationId(organizationId: string): void {
  const store = tenantContextStorage.getStore();
  if (!store) {
    throw new AppError(
      "TENANT_CONTEXT_REQUIRED",
      "Tenant context is not initialized for this request",
      500,
    );
  }

  store.organizationId = organizationId;
}

export function tenantContextRequired(): AppError {
  return new AppError(
    "TENANT_CONTEXT_REQUIRED",
    "Tenant context is required for this database operation",
    500,
  );
}
