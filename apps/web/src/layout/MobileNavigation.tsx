import { MoreHorizontal } from "lucide-react";
import { NavLink } from "react-router-dom";
import { buildNavigationItems, permissionSlugsFromCarrier } from "@amarok-one/permissions";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { NavIcon } from "./nav-icons";

const MOBILE_NAV_PRIORITY = ["service-calls", "messages", "tasks"];

interface MobileNavigationProps {
  onOpenMenu: () => void;
}

export function MobileNavigation({ onOpenMenu }: MobileNavigationProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigationItems = buildNavigationItems(permissionSlugsFromCarrier(user), user?.role.slug, {
    isOrganizationOwner: user?.isOrganizationOwner,
  });
  const dashboardItem = navigationItems.find((item) => item.id.startsWith("dashboard-"));
  const primaryItems = MOBILE_NAV_PRIORITY.flatMap((id) => {
    const item = navigationItems.find((candidate) => candidate.id === id && !candidate.placeholder);
    return item ? [item] : [];
  }).slice(0, 3);

  return (
    <nav className="mobile-navigation" aria-label={t("common", "mainNavigation")}>
      <button
        type="button"
        className="mobile-navigation__item"
        aria-label={t("common", "toggleNavigation")}
        onClick={onOpenMenu}
      >
        <MoreHorizontal aria-hidden="true" size={23} />
        <span>{t("common", "toggleNavigation")}</span>
      </button>
      {primaryItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `mobile-navigation__item${isActive ? " mobile-navigation__item--active" : ""}`
          }
        >
          <NavIcon itemId={item.id} />
          <span>{t("nav", item.labelKey)}</span>
        </NavLink>
      ))}
      {dashboardItem ? (
        <NavLink
          to={dashboardItem.to}
          end={dashboardItem.end}
          className={({ isActive }) =>
            `mobile-navigation__item${isActive ? " mobile-navigation__item--active" : ""}`
          }
        >
          <NavIcon itemId={dashboardItem.id} />
          <span>{t("nav", dashboardItem.labelKey)}</span>
        </NavLink>
      ) : null}
    </nav>
  );
}
