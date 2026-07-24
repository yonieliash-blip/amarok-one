import { NavLink } from "react-router-dom";
import { buildNavigationItems, permissionSlugsFromCarrier } from "@amarok-one/permissions";
import { Logo } from "@amarok-one/ui";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navItems = buildNavigationItems(permissionSlugsFromCarrier(user), user?.role.slug);

  return (
    <>
      <div className="sidebar__brand">
        <Logo label={t("common", "appName")} />
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) =>
          item.placeholder ? (
            <span
              key={item.id}
              className="sidebar__link sidebar__link--disabled"
              aria-disabled="true"
            >
              {t("nav", item.labelKey)}
              <span className="sidebar__badge">{t("common", "soon")}</span>
            </span>
          ) : (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar__link${isActive ? " sidebar__link--active" : ""}`
              }
              onClick={onNavigate}
            >
              {t("nav", item.labelKey)}
            </NavLink>
          ),
        )}
      </nav>

      <div className="sidebar__footer">
        <p>{t("common", "platformFooter")}</p>
      </div>
    </>
  );
}
