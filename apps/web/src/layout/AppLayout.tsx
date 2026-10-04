import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Header } from "./Header";
import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";
import { WorkDayControl } from "../components/WorkDayControl";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { getUnreadMessageCountRequest } from "../lib/messages-api";

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
  if (pathname === "/dashboard/accounting") return t("titles", "officeDashboard");
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
  if (pathname === "/tasks") return t("titles", "tasks");
  if (pathname === "/messages") return t("titles", "messages");
  if (pathname === "/accounting") return t("titles", "accounting");
  if (pathname === "/green-invoice-queries") return t("titles", "greenInvoiceQueries");
  if (pathname === "/reports") return t("titles", "reports");
  if (pathname === "/unauthorized") return t("auth", "accessDenied");
  return t("titles", "default");
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const unreadCountLoaded = useRef(false);
  const isMobileNav = useMobileNav(setSidebarOpen);
  const location = useLocation();
  const { accessToken, user } = useAuth();
  const { t } = useTranslation();
  const title = resolvePageTitle(location.pathname, t);

  useEffect(() => {
    if (!user || !accessToken) return;

    let cancelled = false;
    const refreshUnreadMessages = async (): Promise<void> => {
      try {
        const count = await getUnreadMessageCountRequest(user.organization.id, accessToken);
        if (cancelled) return;
        setUnreadMessageCount((previousCount) => {
          if (
            unreadCountLoaded.current &&
            count > previousCount &&
            location.pathname !== "/messages"
          ) {
            setNewMessageCount(count - previousCount);
          }
          unreadCountLoaded.current = true;
          return count;
        });
      } catch {
        // A temporary notification refresh failure must not interrupt the active screen.
      }
    };

    void refreshUnreadMessages();
    const interval = window.setInterval(() => void refreshUnreadMessages(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [accessToken, location.pathname, user]);

  return (
    <div className="app-shell">
      <aside
        id="app-sidebar"
        className={`sidebar${isMobileNav && sidebarOpen ? " sidebar--open" : ""}${isMobileNav ? " sidebar--drawer" : " sidebar--docked"}`}
        aria-label={t("common", "mainNavigation")}
        aria-hidden={isMobileNav && !sidebarOpen ? true : undefined}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      <div className="app-shell__main">
        <Header
          title={title}
          menuOpen={isMobileNav && sidebarOpen}
          onMenuToggle={() => setSidebarOpen((value) => !value)}
          unreadMessageCount={user ? unreadMessageCount : 0}
        />
        <div className="app-shell__work-day">
          <WorkDayControl />
        </div>
        <main className="app-shell__content">
          <Outlet />
        </main>
        <MobileNavigation
          onOpenMenu={() => setSidebarOpen(true)}
          unreadMessageCount={user ? unreadMessageCount : 0}
        />
      </div>

      {newMessageCount > 0 && location.pathname !== "/messages" ? (
        <aside className="message-notice" role="status" aria-live="polite">
          <div>
            <strong>
              {newMessageCount === 1
                ? t("messages", "newMessageNotice")
                : t("messages", "newMessagesNotice", { count: newMessageCount })}
            </strong>
            <Link to="/messages" onClick={() => setNewMessageCount(0)}>
              {t("messages", "openMessages")}
            </Link>
          </div>
          <button
            type="button"
            className="message-notice__dismiss"
            onClick={() => setNewMessageCount(0)}
            aria-label={t("messages", "dismissNewMessages")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      ) : null}

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
