import type { DashboardKind } from "@amarok-one/permissions";
import { RoleDashboardPage } from "./RoleDashboardPage";

function createDashboardRoute(kind: DashboardKind) {
  return function DashboardRoute() {
    return <RoleDashboardPage kind={kind} />;
  };
}

export const ManagementDashboardPage = createDashboardRoute("management");
export const ExecutiveDashboardPage = createDashboardRoute("executive");
export const ServiceDashboardPage = createDashboardRoute("service");
export const WarehouseDashboardPage = createDashboardRoute("warehouse");
export const AccountingDashboardPage = createDashboardRoute("accounting");
export const ReadOnlyDashboardPage = createDashboardRoute("read-only");
