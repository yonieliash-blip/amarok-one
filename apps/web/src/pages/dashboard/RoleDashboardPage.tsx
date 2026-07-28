import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { Badge, Card } from "@amarok-one/ui";
import type { DashboardKind } from "@amarok-one/permissions";
import { buildNavigationItems, permissionSlugsFromCarrier } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { healthRequest } from "../../lib/auth-api";
import { NavIcon } from "../../layout/nav-icons";
import { pickDashboardQuickLinks } from "../../layout/sidebar-groups";
import { STAT_CARD_KEYS, statCardDescriptionKey, statCardTitleKey } from "./dashboard-stats";

type DashboardStatus = "loading" | "ready" | "error";

interface RoleDashboardPageProps {
  kind: DashboardKind;
}

export function RoleDashboardPage({ kind }: RoleDashboardPageProps) {
  const { user } = useAuth();
  const { t, direction } = useTranslation();
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth(): Promise<void> {
      setStatus("loading");
      try {
        const health = await healthRequest();
        if (!cancelled) {
          setApiStatus(health.status);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return <LoadingState message={t("dashboard", "loading")} />;
  }

  const quickLinks = pickDashboardQuickLinks(
    buildNavigationItems(permissionSlugsFromCarrier(user), user.role.slug),
  );

  const title = {
    management: t("dashboard", "managementTitle"),
    executive: t("dashboard", "executiveTitle"),
    service: t("dashboard", "serviceTitle"),
    warehouse: t("dashboard", "warehouseTitle"),
    accounting: t("dashboard", "accountingTitle"),
    "read-only": t("dashboard", "readOnlyTitle"),
  }[kind];

  const subtitle = {
    management: t("dashboard", "managementSubtitle", {
      organization: user.organization.name,
      role: user.role.name,
    }),
    executive: t("dashboard", "executiveSubtitle", {
      organization: user.organization.name,
      role: user.role.name,
    }),
    service: t("dashboard", "serviceSubtitle", {
      organization: user.organization.name,
      role: user.role.name,
    }),
    warehouse: t("dashboard", "warehouseSubtitle", {
      organization: user.organization.name,
      role: user.role.name,
    }),
    accounting: t("dashboard", "accountingSubtitle", {
      organization: user.organization.name,
      role: user.role.name,
    }),
    "read-only": t("dashboard", "readOnlySubtitle", {
      organization: user.organization.name,
      role: user.role.name,
    }),
  }[kind];

  const statKeys = STAT_CARD_KEYS[kind];
  const QuickLinkArrow = direction === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="dashboard">
      <section className="dashboard__hero" aria-labelledby="dashboard-hero-title">
        <div className="dashboard__hero-copy">
          <p className="dashboard__greeting">
            {t("dashboard", "greeting", { name: user.displayName })}
          </p>
          <p className="dashboard__eyebrow">{t("dashboard", "welcomeBack")}</p>
          <h2 className="dashboard__title" id="dashboard-hero-title">
            {title}
          </h2>
          <p className="dashboard__subtitle">{subtitle}</p>
        </div>
        {status === "ready" && apiStatus ? (
          <div className="dashboard__status">
            <Activity size={18} aria-hidden="true" />
            <Badge variant={apiStatus === "ok" ? "success" : "warning"}>
              {t("dashboard", "apiStatus", { status: apiStatus.toUpperCase() })}
            </Badge>
          </div>
        ) : null}
      </section>

      {quickLinks.length > 0 ? (
        <section className="dashboard__quick" aria-labelledby="dashboard-quick-title">
          <h2 className="dashboard__section-title" id="dashboard-quick-title">
            {t("dashboard", "quickActions")}
          </h2>
          <ul className="dashboard__quick-list">
            {quickLinks.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="dashboard__quick-link">
                  <NavIcon itemId={item.id} className="dashboard__quick-icon" />
                  <span className="dashboard__quick-label">{t("nav", item.labelKey)}</span>
                  <QuickLinkArrow className="dashboard__quick-arrow" size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === "loading" ? <LoadingState message={t("dashboard", "checkingStatus")} /> : null}

      {status === "error" ? (
        <ErrorState
          title={t("dashboard", "apiUnreachableTitle")}
          message={t("dashboard", "apiUnreachableMessage")}
          onRetry={() => window.location.reload()}
        />
      ) : null}

      {status === "ready" ? (
        <>
          <section className="dashboard__metrics" aria-labelledby="dashboard-metrics-title">
            <h2 className="dashboard__section-title visually-hidden" id="dashboard-metrics-title">
              {t("dashboard", "metricsSection")}
            </h2>
            <div className="dashboard__stats">
              {statKeys.map((statKey) => (
                <article key={statKey} className="dashboard__stat-card amarok-card">
                  <h3 className="amarok-card__title">
                    {t("dashboard", statCardTitleKey(statKey))}
                  </h3>
                  <p className="amarok-card__description">
                    {t("dashboard", statCardDescriptionKey(statKey))}
                  </p>
                  <p className="dashboard__stat-value">{t("dashboard", "statPlaceholderValue")}</p>
                  <p className="dashboard__stat-note">{t("dashboard", "statComingSoon")}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="dashboard__grid">
            <Card
              title={t("dashboard", "operationsOverviewTitle")}
              description={t("dashboard", "operationsOverviewDescription")}
            >
              <p className="dashboard__placeholder-copy">{t("dashboard", "noModulesMessage")}</p>
            </Card>

            <Card
              title={t("dashboard", "organizationTitle")}
              description={t("dashboard", "organizationDescription")}
            >
              <div className="dashboard__org-card">
                <Building2 className="dashboard__org-icon" size={22} aria-hidden="true" />
                <dl className="dashboard__details">
                  <div>
                    <dt>{t("org", "name")}</dt>
                    <dd>{user.organization.name}</dd>
                  </div>
                  <div>
                    <dt>{t("org", "slug")}</dt>
                    <dd dir="ltr">{user.organization.slug}</dd>
                  </div>
                  <div>
                    <dt>{t("org", "role")}</dt>
                    <dd>{user.role.name}</dd>
                  </div>
                </dl>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
