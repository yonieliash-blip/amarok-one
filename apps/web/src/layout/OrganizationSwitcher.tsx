import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { useDismissOnEscape } from "./useDismissOnEscape";

export function OrganizationSwitcher() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismissOnEscape(open, () => setOpen(false));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="org-switcher" ref={containerRef}>
      <button
        type="button"
        className="org-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="org-switcher__label">{t("org", "label")}</span>
        <span className="org-switcher__value">{user.organization.name}</span>
        <ChevronDown className="org-switcher__chevron" size={18} aria-hidden="true" />
      </button>

      {open ? (
        <ul className="org-switcher__menu" role="listbox">
          <li
            className="org-switcher__option org-switcher__option--active"
            role="option"
            aria-selected="true"
          >
            <span className="org-switcher__option-name">{user.organization.name}</span>
            <span className="org-switcher__option-slug" dir="ltr">
              {user.organization.slug}
            </span>
          </li>
          <li className="org-switcher__empty" role="presentation">
            {t("org", "additionalOrgsHint")}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
