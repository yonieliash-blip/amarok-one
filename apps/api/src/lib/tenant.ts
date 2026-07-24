import { forbidden } from "./errors.js";

/** Ensures the requested organization matches the authenticated tenant context. */
export function assertTenantOrganization(
  requestedOrganizationId: string,
  authOrganizationId: string,
): void {
  if (requestedOrganizationId !== authOrganizationId) {
    throw forbidden("Access denied for this organization");
  }
}
