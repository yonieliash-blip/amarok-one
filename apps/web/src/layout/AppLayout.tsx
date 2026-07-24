import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useTranslation } from "../i18n/useTranslation";

const MOBILE_NAV_QUERY = "(max-width: 768px)";

function useMobileNav(setSidebarOpen: Dispatch<SetStateAction<boolean>>): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_NAV_QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY);
    const update = (): void => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [setSidebarOpen]);

  return isMobile;
}

function resolvePageTitle(pathname: string, t: ReturnType<typeof useTranslation>["t"]): string {
  if (pathname === "/dashboard/management") return t("titles", "managementDashboard");
  if (pathname === "/dashboard/executive") return t("titles", "executiveDashboard");
  if (pathname === "/dashboard/service") return t("titles", "serviceDashboard");
  if (pathname === "/dashboard/warehouse") return t("titles", "warehouseDashboard");
  if (pathname === "/dashboard/accounting") return t("titles", "accountingDashboard");
  if (pathname === "/dashboard/read-only") return t("titles", "readOnlyDashboard");
  if (pathname === "/") return t("titles", "dashboard");
  if (pathname === "/customers") return t("titles", "customers");
  if (pathname === "/customers/new") return t("titles", "newCustomer");
  if (/^\/customers\/[^/]+\/edit$/.test(pathname)) return t("titles", "editCustomer");
  if (/^\/customers\/[^/]+$/.test(pathname)) return t("titles", "customerDetails");
  if (pathname === "/equipment") return t("titles", "equipment");
  if (pathname === "/equipment/new") return t("titles", "newEquipment");
  if (/^\/equipment\/[^/]+\/edit$/.test(pathname)) return t("titles", "editEquipment");
  if (/^\/equipment\/[^/]+$/.test(pathname)) return t("titles", "equipmentDetails");
  if (pathname === "/service-calls") return t("titles", "serviceCalls");
  if (pathname === "/service-calls/new") return t("titles", "newServiceCall");
  if (/^\/service-calls\/[^/]+\/edit$/.test(pathname)) return t("titles", "editServiceCall");
  if (/^\/service-calls\/[^/]+$/.test(pathname)) return t("titles", "serviceCallDetails");
  if (pathname === "/my/service-calls") return t("titles", "myServiceCalls");
  if (pathname === "/my/equipment") return t("titles", "myEquipment");
  if (pathname === "/my/schedule") return t("titles", "mySchedule");
  if (pathname === "/technicians") return t("titles", "technicians");
  if (pathname === "/calendar") return t("titles", "calendar");
  if (pathname === "/inventory") return t("titles", "inventory");
  if (pathname === "/purchase-orders") return t("titles", "purchaseOrders");
  if (pathname === "/parts") return t("titles", "parts");
  if (pathname === "/accounting") return t("titles", "accounting");
  if (pathname === "/reports") return t("titles", "reports");
  if (pathname === "/unauthorized") return t("auth", "accessDenied");
  return t("titles", "default");
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobileNav = useMobileNav(setSidebarOpen);
  const location = useLocation();
  const { t } = useTranslation();
  const title = resolvePageTitle(location.pathname, t);

  return (
    <div className="app-shell">
      <aside
        className={`sidebar${isMobileNav && sidebarOpen ? " sidebar--open" : ""}${isMobileNav ? " sidebar--drawer" : " sidebar--docked"}`}
        aria-label={t("common", "mainNavigation")}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      <div className="app-shell__main">
        <Header title={title} onMenuToggle={() => setSidebarOpen((value) => !value)} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>

      {isMobileNav && sidebarOpen ? (
        <button
          type="button"
          className="app-shell__backdrop"
          aria-label={t("common", "closeNavigation")}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
}
