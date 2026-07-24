import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ServiceCall } from "@amarok-one/types";
import { useAuth } from "../../auth/useAuth";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { ServiceCallStatusBadge } from "../../components/ServiceCallStatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { isApiRequestError } from "../../lib/api-client";
import {
  groupTechnicianServiceCalls,
  type ServiceCallSection,
} from "../../lib/service-call-groups";
import { listServiceCallsRequest } from "../../lib/service-calls-api";

type PageStatus = "loading" | "ready" | "error";

function ServiceCallSectionList({
  title,
  calls,
  emptyMessage,
}: {
  title: string;
  calls: ServiceCall[];
  emptyMessage: string;
}) {
  const { t, locale } = useTranslation();

  if (calls.length === 0) {
    return (
      <section className="customer-detail-card customer-detail-card--wide">
        <h3>{title}</h3>
        <p className="customer-detail-notes">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="customer-detail-card customer-detail-card--wide">
      <h3>{title}</h3>
      <div className="customers-table-wrap">
        <table className="customers-table">
          <thead>
            <tr>
              <th>{t("serviceCalls", "tableNumber")}</th>
              <th>{t("serviceCalls", "tableTitle")}</th>
              <th>{t("serviceCalls", "tableCustomer")}</th>
              <th>{t("serviceCalls", "tableStatus")}</th>
              <th>{t("serviceCalls", "tablePriority")}</th>
              <th>{t("serviceCalls", "scheduledAt")}</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td dir="ltr">
                  <Link to={`/service-calls/${call.id}`}>{call.serviceCallNumber}</Link>
                </td>
                <td>{call.title}</td>
                <td>{call.customer?.name ?? t("common", "emptyValue")}</td>
                <td>
                  <ServiceCallStatusBadge status={call.status} />
                </td>
                <td>
                  <ServiceCallPriorityBadge priority={call.priority} />
                </td>
                <td>
                  {call.scheduledAt
                    ? formatDate(call.scheduledAt, locale)
                    : t("common", "emptyValue")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MyServiceCallsPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [grouped, setGrouped] = useState(() => groupTechnicianServiceCalls([]));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken) return;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const result = await listServiceCallsRequest(user.organization.id, accessToken, {
          pageSize: 100,
        });
        if (!cancelled) {
          setGrouped(groupTechnicianServiceCalls(result.data));
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("serviceCalls", "loadErrorMessage"))
              : t("serviceCalls", "loadErrorMessage"),
          );
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, t]);

  if (!user || !accessToken) {
    return <LoadingState message={t("serviceCalls", "loading")} />;
  }

  const sectionCopy: Record<ServiceCallSection, { title: string; empty: string }> = {
    today: {
      title: t("serviceCalls", "todaySection"),
      empty: t("serviceCalls", "todayEmpty"),
    },
    upcoming: {
      title: t("serviceCalls", "upcomingSection"),
      empty: t("serviceCalls", "upcomingEmpty"),
    },
    completed: {
      title: t("serviceCalls", "completedSection"),
      empty: t("serviceCalls", "completedEmpty"),
    },
  };

  const totalCalls = grouped.today.length + grouped.upcoming.length + grouped.completed.length;

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("serviceCalls", "myCallsEyebrow")}</p>
          <h2 className="customers-page__title">{t("serviceCalls", "myTitle")}</h2>
          <p className="customers-page__subtitle">{t("serviceCalls", "mySubtitle")}</p>
        </div>
      </header>

      {status === "loading" ? <LoadingState message={t("serviceCalls", "loading")} /> : null}

      {status === "error" ? (
        <ErrorState
          title={t("serviceCalls", "loadErrorTitle")}
          message={errorMessage ?? t("serviceCalls", "loadErrorMessage")}
          onRetry={() => window.location.reload()}
        />
      ) : null}

      {status === "ready" && totalCalls === 0 ? (
        <EmptyState
          title={t("serviceCalls", "myEmptyTitle")}
          message={t("serviceCalls", "myEmptyMessage")}
          icon="🛠"
        />
      ) : null}

      {status === "ready" && totalCalls > 0 ? (
        <div className="customer-detail-grid">
          <ServiceCallSectionList
            title={sectionCopy.today.title}
            calls={grouped.today}
            emptyMessage={sectionCopy.today.empty}
          />
          <ServiceCallSectionList
            title={sectionCopy.upcoming.title}
            calls={grouped.upcoming}
            emptyMessage={sectionCopy.upcoming.empty}
          />
          <ServiceCallSectionList
            title={sectionCopy.completed.title}
            calls={grouped.completed}
            emptyMessage={sectionCopy.completed.empty}
          />
        </div>
      ) : null}
    </div>
  );
}
