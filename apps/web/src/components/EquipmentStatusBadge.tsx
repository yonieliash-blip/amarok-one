import type { EquipmentStatus } from "@amarok-one/types";
import { Badge } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import { getEquipmentStatusLabel } from "../lib/equipment-status";

const STATUS_VARIANTS: Record<EquipmentStatus, "success" | "default" | "warning" | "danger"> = {
  active: "success",
  in_service: "warning",
  out_of_service: "danger",
  retired: "default",
};

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus;
}

export function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
  const { t } = useTranslation();

  return <Badge variant={STATUS_VARIANTS[status]}>{getEquipmentStatusLabel(t, status)}</Badge>;
}
