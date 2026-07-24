import { Navigate, Outlet, useLocation } from "react-router-dom";
import { resolveAuthorizedPath } from "@amarok-one/permissions";
import { LoadingState } from "../components/LoadingState";
import { useTranslation } from "../i18n/useTranslation";
import { UnauthorizedPage } from "../pages/UnauthorizedPage";
import { useAuth } from "./useAuth";
import { usePermissions } from "./usePermissions";

function isWriteRoute(pathname: string): boolean {
  return pathname.endsWith("/new") || pathname.includes("/edit");
}

function permissionSlugsFromUser(user: { permissions: Array<{ slug: string }> } | null): string[] {
  return user?.permissions.map((permission) => permission.slug) ?? [];
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (status === "loading") {
    return <LoadingState message={t("auth", "restoringSession")} fullScreen />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function PermissionRoute() {
  const location = useLocation();
  const { user } = useAuth();
  const { canAccessPath } = usePermissions();
  const allowed = canAccessPath(location.pathname, {
    requireWrite: isWriteRoute(location.pathname),
    activeRoleSlug: user?.role.slug,
  });

  if (!allowed) {
    return <UnauthorizedPage />;
  }

  return <Outlet />;
}

function activeRoleSlugFromUser(user: { role: { slug: string } } | null): string | undefined {
  return user?.role.slug;
}

export function PublicRoute() {
  const { status, user } = useAuth();
  const location = useLocation();
  const slugs = permissionSlugsFromUser(user);
  const activeRoleSlug = activeRoleSlugFromUser(user);
  const preferredFrom =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : undefined;
  const redirectTo = resolveAuthorizedPath(slugs, preferredFrom, activeRoleSlug);

  if (status === "loading") {
    return <LoadingState fullScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export function RootRedirect() {
  const { status, user } = useAuth();
  const { t } = useTranslation();

  if (status === "loading") {
    return <LoadingState message={t("auth", "restoringSession")} fullScreen />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={resolveAuthorizedPath(
        permissionSlugsFromUser(user),
        undefined,
        activeRoleSlugFromUser(user),
      )}
      replace
    />
  );
}
