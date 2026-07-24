import type { CustomerStatus } from "@amarok-one/types";
import { Badge } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import { getCustomerStatusLabel } from "../lib/customer-status";

const STATUS_VARIANTS: Record<CustomerStatus, "success" | "default" | "warning"> = {
  active: "success",
  inactive: "default",
  prospect: "warning",
};

interface CustomerStatusBadgeProps {
  status: CustomerStatus;
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  const { t } = useTranslation();

  return <Badge variant={STATUS_VARIANTS[status]}>{getCustomerStatusLabel(t, status)}</Badge>;
}
