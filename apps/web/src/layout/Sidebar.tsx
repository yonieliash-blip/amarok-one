import { NavLink } from "react-router-dom";
import { buildNavigationItems, permissionSlugsFromCarrier } from "@amarok-one/permissions";
import { Logo } from "@amarok-one/ui";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { NavIcon } from "./nav-icons";
import { groupNavigationItems } from "./sidebar-groups";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navItems = buildNavigationItems(permissionSlugsFromCarrier(user), user?.role.slug);
  const sections = groupNavigationItems(navItems);

  return (
    <>
      <div className="sidebar__brand">
        <Logo label={t("common", "appName")} />
        {user ? (
          <p className="sidebar__org" title={user.organization.name}>
            {user.organization.name}
          </p>
        ) : null}
      </div>

      <div className="sidebar__scroll">
        {sections.map((section) => (
          <section
            key={section.key}
            className="sidebar__group"
            aria-labelledby={`nav-group-${section.key}`}
          >
            <h2 className="sidebar__group-label" id={`nav-group-${section.key}`}>
              {t("nav", section.labelKey)}
            </h2>
            <ul className="sidebar__list">
              {section.items.map((item) => (
                <li key={item.id}>
                  {item.placeholder ? (
                    <span className="sidebar__link sidebar__link--disabled" aria-disabled="true">
                      <span className="sidebar__link-main">
                        <NavIcon itemId={item.id} className="sidebar__icon" />
                        <span className="sidebar__link-text">{t("nav", item.labelKey)}</span>
                      </span>
                      <span className="sidebar__badge">{t("common", "soon")}</span>
                    </span>
                  ) : (
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `sidebar__link${isActive ? " sidebar__link--active" : ""}`
                      }
                      onClick={onNavigate}
                    >
                      <span className="sidebar__link-main">
                        <NavIcon itemId={item.id} className="sidebar__icon" />
                        <span className="sidebar__link-text">{t("nav", item.labelKey)}</span>
                      </span>
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="sidebar__footer">
        <p>{t("common", "platformFooter")}</p>
      </div>
    </>
  );
}
