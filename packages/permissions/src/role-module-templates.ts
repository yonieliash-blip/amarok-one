import type { ModuleKey } from "./modules.js";

/** Default module entitlements seeded when assigning a business role template. */
export const ROLE_MODULE_TEMPLATES: Readonly<Record<string, readonly ModuleKey[]>> = {
  "organization-owner": ["core", "service", "inventory", "finance", "administration"],
  "system-administrator": ["core", "service", "inventory", "finance", "administration"],
  "service-manager": ["core", "service", "administration"],
  "service-coordinator": ["core", "service"],
  technician: ["core"],
  "parts-manager": ["core", "inventory"],
  "warehouse-employee": ["core", "inventory"],
  accounting: ["core", "finance"],
  "read-only": ["core", "service", "inventory", "finance"],
};

export function getDefaultModulesForRole(roleSlug: string): readonly ModuleKey[] {
  return ROLE_MODULE_TEMPLATES[roleSlug] ?? ["core"];
}
