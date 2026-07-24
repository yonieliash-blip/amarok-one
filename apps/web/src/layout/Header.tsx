import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { UserMenu } from "./UserMenu";
import { useTranslation } from "../i18n/useTranslation";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <div className="app-header__start">
        <button
          type="button"
          className="app-header__menu-button"
          aria-label={t("common", "toggleNavigation")}
          onClick={onMenuToggle}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div>
          <p className="app-header__eyebrow">{t("common", "operations")}</p>
          <h1 className="app-header__title">{title}</h1>
        </div>
      </div>

      <div className="app-header__end">
        <OrganizationSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
