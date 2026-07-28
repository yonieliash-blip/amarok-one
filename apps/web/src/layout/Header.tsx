import { Menu } from "lucide-react";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  menuOpen?: boolean;
}

export function Header({ title, onMenuToggle, menuOpen = false }: HeaderProps) {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="app-header">
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
          <p className="app-header__eyebrow">{t("common", "operations")}</p>
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
        <OrganizationSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
