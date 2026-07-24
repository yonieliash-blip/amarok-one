import type { EquipmentStatus } from "@amarok-one/types";
import type { I18nContextValue } from "../i18n/i18n-context";

export const EQUIPMENT_STATUS_KEYS: Record<EquipmentStatus, string> = {
  active: "statusActive",
  in_service: "statusInService",
  out_of_service: "statusOutOfService",
  retired: "statusRetired",
};

export function getEquipmentStatusLabel(t: I18nContextValue["t"], status: EquipmentStatus): string {
  return t("equipment", EQUIPMENT_STATUS_KEYS[status]);
}
