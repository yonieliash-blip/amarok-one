import { Navigate } from "react-router-dom";
import { getDefaultLandingPath } from "@amarok-one/permissions";
import { useAuth } from "../auth/useAuth";
import { usePermissionSlugs } from "../auth/usePermissions";

/** Redirects the index route to the active role landing page. */
export function HomePage() {
  const { user } = useAuth();
  const slugs = usePermissionSlugs();

  return <Navigate to={getDefaultLandingPath(slugs, user?.role.slug)} replace />;
}
