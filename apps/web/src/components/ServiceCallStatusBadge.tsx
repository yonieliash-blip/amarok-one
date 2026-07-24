import type { ServiceCallStatus } from "@amarok-one/types";
import { Badge } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import { getServiceCallStatusLabel } from "../lib/service-call-labels";

const STATUS_VARIANTS: Record<ServiceCallStatus, "success" | "default" | "warning" | "danger"> = {
  open: "warning",
  scheduled: "default",
  in_progress: "warning",
  waiting_for_parts: "danger",
  completed: "success",
  cancelled: "default",
};

interface ServiceCallStatusBadgeProps {
  status: ServiceCallStatus;
}

export function ServiceCallStatusBadge({ status }: ServiceCallStatusBadgeProps) {
  const { t } = useTranslation();

  return <Badge variant={STATUS_VARIANTS[status]}>{getServiceCallStatusLabel(t, status)}</Badge>;
}
