import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDefaultLandingPath } from "@amarok-one/permissions";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";

export function UserMenu() {
  const { user, logout, switchRole } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [switchingRoleId, setSwitchingRoleId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const initials = user.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasMultipleRoles = user.roles.length > 1;

  async function handleLogout(): Promise<void> {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  async function handleSwitchRole(roleId: string): Promise<void> {
    if (!user || roleId === user.role.id) {
      setOpen(false);
      return;
    }

    setSwitchingRoleId(roleId);
    try {
      const updatedUser = await switchRole(roleId);
      const landingPath = getDefaultLandingPath(
        updatedUser.permissions.map((permission) => permission.slug),
        updatedUser.role.slug,
      );
      navigate(landingPath, { replace: true });
    } finally {
      setSwitchingRoleId(null);
      setOpen(false);
    }
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="user-menu__meta">
          <span className="user-menu__name">{user.displayName}</span>
          <span className="user-menu__role">{user.role.name}</span>
        </span>
      </button>

      {open ? (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__details">
            <p className="user-menu__label">{t("userMenu", "fullName")}</p>
            <p className="user-menu__value">{user.displayName}</p>
            <p className="user-menu__label">{t("userMenu", "email")}</p>
            <p className="user-menu__email" dir="ltr">
              {user.email}
            </p>
            <p className="user-menu__label">{t("userMenu", "company")}</p>
            <p className="user-menu__value">{user.organization.name}</p>
            <p className="user-menu__label">{t("userMenu", "activeRole")}</p>
            <p className="user-menu__value">{user.role.name}</p>
          </div>

          {hasMultipleRoles ? (
            <div className="user-menu__roles" role="group" aria-label={t("userMenu", "switchRole")}>
              <p className="user-menu__section-title">{t("userMenu", "switchRole")}</p>
              {user.roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`user-menu__role-option${role.id === user.role.id ? " user-menu__role-option--active" : ""}`}
                  role="menuitemradio"
                  aria-checked={role.id === user.role.id}
                  disabled={switchingRoleId !== null}
                  onClick={() => void handleSwitchRole(role.id)}
                >
                  {switchingRoleId === role.id ? t("userMenu", "switchingRole") : role.name}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className="user-menu__action"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void handleLogout()}
          >
            {signingOut ? t("auth", "signingOut") : t("auth", "signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
