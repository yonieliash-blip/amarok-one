import { Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  buildNavigationItems,
  getDefaultLandingPath,
  permissionSlugsFromCarrier,
} from "@amarok-one/permissions";
import { BrandLogo } from "../components/BrandLogo";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { WorkDayControl } from "../components/WorkDayControl";

const PRIMARY_NAV_ITEM_IDS = new Set([
  "service-calls",
  "completed-service-calls",
  "customers",
  "equipment",
  "technicians",
  "reports",
  "member-access",
  "messages",
  "office-chat",
  "tasks",
  "green-invoice-queries",
]);

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  menuOpen?: boolean;
  unreadMessageCount?: number;
  onWorkDayStatusChange?: (active: boolean) => void;
}

export function Header({
  title,
  onMenuToggle,
  menuOpen = false,
  unreadMessageCount = 0,
  onWorkDayStatusChange,
}: HeaderProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const permissions = permissionSlugsFromCarrier(user);
  const homePath = getDefaultLandingPath(permissions, user?.role.slug);
  const navigationItems = buildNavigationItems(permissions, user?.role.slug, {
    isOrganizationOwner: user?.isOrganizationOwner,
  }).filter(
    (item) =>
      !item.placeholder && (item.id.startsWith("dashboard-") || PRIMARY_NAV_ITEM_IDS.has(item.id)),
  );

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <NavLink
          to={homePath}
          className="app-header__brand-link"
          aria-label={t("nav", "dashboard")}
        >
          <BrandLogo variant="header" />
        </NavLink>
      </div>

      <nav className="app-header__navigation" aria-label={t("common", "mainNavigation")}>
        {navigationItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `app-header__navigation-link${isActive ? " app-header__navigation-link--active" : ""}`
            }
          >
            {t("nav", item.labelKey)}
            {(item.id === "messages" || item.id === "office-chat") && unreadMessageCount > 0 ? (
              <span
                className="app-header__unread"
                aria-label={`${unreadMessageCount} ${t("messages", "unread")}`}
              >
                {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="app-header__start">
        <button
          type="button"
          className="app-header__menu-button"
          aria-label={t("common", "toggleNavigation")}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={onMenuToggle}
        >
          <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="app-header__titles">
          <h1 className="app-header__title">{title}</h1>
          {user ? (
            <p className="app-header__context">
              <span className="app-header__org-name">{user.organization.name}</span>
              <span className="app-header__role-sep" aria-hidden="true">
                ·
              </span>
              <span>{user.role.name}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="app-header__end">
        <div className="app-header__work-day">
          <WorkDayControl onActiveChange={onWorkDayStatusChange} />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
