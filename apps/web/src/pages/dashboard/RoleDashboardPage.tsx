import { useEffect, useState } from "react";
import { Badge, Card } from "@amarok-one/ui";
import type { DashboardKind } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { healthRequest } from "../../lib/auth-api";
import { STAT_CARD_KEYS, statCardDescriptionKey, statCardTitleKey } from "./dashboard-stats";

type DashboardStatus = "loading" | "ready" | "error";

interface RoleDashboardPageProps {
  kind: DashboardKind;
}

export function RoleDashboardPage({ kind }: RoleDashboardPageProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
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

  return (
    <div className="dashboard">
      <section className="dashboard__hero">
        <div>
          <p className="dashboard__eyebrow">{t("dashboard", "welcomeBack")}</p>
          <h2 className="dashboard__title">{title}</h2>
          <p className="dashboard__subtitle">{subtitle}</p>
        </div>
        {status === "ready" && apiStatus ? (
          <Badge variant={apiStatus === "ok" ? "success" : "warning"}>
            {t("dashboard", "apiStatus", { status: apiStatus.toUpperCase() })}
          </Badge>
        ) : null}
      </section>

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
          <div className="dashboard__stats">
            {statKeys.map((statKey) => (
              <Card
                key={statKey}
                title={t("dashboard", statCardTitleKey(statKey))}
                description={t("dashboard", statCardDescriptionKey(statKey))}
              >
                <p className="dashboard__stat-value">{t("dashboard", "statPlaceholderValue")}</p>
                <p className="dashboard__stat-note">{t("dashboard", "statComingSoon")}</p>
              </Card>
            ))}
          </div>

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
              <dl className="dashboard__details">
                <div>
                  <dt>{t("org", "name")}</dt>
                  <dd>{user.organization.name}</dd>
                </div>
                <div>
                  <dt>{t("userMenu", "company")}</dt>
                  <dd>{user.organization.name}</dd>
                </div>
                <div>
                  <dt>{t("org", "role")}</dt>
                  <dd>{user.role.name}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
