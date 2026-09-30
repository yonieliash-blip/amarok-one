/** Route entry points for role dashboards (re-export pattern). */
/* eslint-disable react-refresh/only-export-components */
import type { DashboardKind } from "@amarok-one/permissions";
import { RoleDashboardPage } from "./RoleDashboardPage";

export { ServiceDashboardPage } from "./ServiceManagerDashboardPage";

function createDashboardRoute(kind: DashboardKind) {
  return function DashboardRoute() {
    return <RoleDashboardPage kind={kind} />;
  };
}

export { ManagementDashboardPage } from "./ManagementDashboardPage";
// Organization owners land on the executive route. Reuse the approved management
// dashboard here so the default landing page has the same data-driven design.
export { ManagementDashboardPage as ExecutiveDashboardPage } from "./ManagementDashboardPage";
export const WarehouseDashboardPage = createDashboardRoute("warehouse");
export const AccountingDashboardPage = createDashboardRoute("accounting");
export const ReadOnlyDashboardPage = createDashboardRoute("read-only");
