import type { ServiceCallPriority } from "@amarok-one/types";
import { Badge } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import { getServiceCallPriorityLabel } from "../lib/service-call-labels";

const PRIORITY_VARIANTS: Record<ServiceCallPriority, "default" | "success" | "warning" | "danger"> =
  {
    low: "default",
    normal: "success",
    high: "warning",
    urgent: "danger",
  };

interface ServiceCallPriorityBadgeProps {
  priority: ServiceCallPriority;
}

export function ServiceCallPriorityBadge({ priority }: ServiceCallPriorityBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge variant={PRIORITY_VARIANTS[priority]}>{getServiceCallPriorityLabel(t, priority)}</Badge>
  );
}
