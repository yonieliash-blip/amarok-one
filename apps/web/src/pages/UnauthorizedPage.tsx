import { Link } from "react-router-dom";
import { Button } from "@amarok-one/ui";
import { getDefaultLandingPath } from "@amarok-one/permissions";
import { useAuth } from "../auth/useAuth";
import { useTranslation } from "../i18n/useTranslation";

export function UnauthorizedPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const homePath = getDefaultLandingPath(
    user?.permissions.map((permission) => permission.slug) ?? [],
    user?.role.slug,
  );

  return (
    <div className="state state--error state--fullscreen" role="alert">
      <h2 className="state__title">{t("auth", "accessDenied")}</h2>
      <p className="state__message">{t("unauthorized", "message")}</p>
      <Link to={homePath}>
        <Button variant="primary">{t("unauthorized", "backHome")}</Button>
      </Link>
    </div>
  );
}
