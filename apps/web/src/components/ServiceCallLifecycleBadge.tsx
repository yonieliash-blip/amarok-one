import type { ServiceCallLifecycleState } from "@amarok-one/types";
import { Badge } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import {
  getServiceCallLifecycleLabel,
  LIFECYCLE_BADGE_VARIANTS,
} from "../lib/service-call-lifecycle-labels";

interface ServiceCallLifecycleBadgeProps {
  lifecycleState: ServiceCallLifecycleState;
}

export function ServiceCallLifecycleBadge({ lifecycleState }: ServiceCallLifecycleBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge variant={LIFECYCLE_BADGE_VARIANTS[lifecycleState]}>
      {getServiceCallLifecycleLabel(t, lifecycleState)}
    </Badge>
  );
}
