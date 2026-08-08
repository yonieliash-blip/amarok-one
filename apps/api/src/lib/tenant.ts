import { isPlatformAdmin } from "@amarok-one/permissions";
import { forbidden } from "./errors.js";
import { setRequestTenantOrganizationId } from "./tenant-context.js";

/** Ensures the requested organization matches the authenticated tenant context. */
export function assertTenantOrganization(
  requestedOrganizationId: string,
  authOrganizationId: string,
): void {
  if (requestedOrganizationId !== authOrganizationId) {
    throw forbidden("Access denied for this organization");
  }
}

/** Validates tenant access and scopes cross-tenant platform admin requests to the target organization. */
export function assertTenantOrganizationAccess(
  requestedOrganizationId: string,
  authOrganizationId: string,
  permissions: Iterable<string>,
): void {
  if (requestedOrganizationId === authOrganizationId) {
    return;
  }

  if (!isPlatformAdmin(permissions)) {
    throw forbidden("Access denied for this organization");
  }

  setRequestTenantOrganizationId(requestedOrganizationId);
}
