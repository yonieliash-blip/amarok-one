import type { CustomerStatus } from "@amarok-one/types";
import type { I18nContextValue } from "../i18n/i18n-context";

export const STATUS_KEYS: Record<CustomerStatus, string> = {
  active: "statusActive",
  inactive: "statusInactive",
  prospect: "statusProspect",
};

export function getCustomerStatusLabel(t: I18nContextValue["t"], status: CustomerStatus): string {
  return t("customers", STATUS_KEYS[status]);
}
