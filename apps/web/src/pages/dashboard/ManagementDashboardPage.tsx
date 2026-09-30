import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogPart, ServiceCall } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Clock3,
  Package,
  Plus,
  RefreshCw,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { LoadingState } from "../../components/LoadingState";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { formatDate, formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listPartsCatalogRequest } from "../../lib/parts-api";
import {
  endOfLocalDay,
  fetchAllServiceCalls,
  isActiveServiceCall,
  isInProgressServiceCall,
  isWaitingForManager,
  startOfLocalDay,
} from "../../lib/service-manager-dashboard";
import { hasServiceCallsWrite } from "../../lib/service-calls-api";

type PageStatus = "loading" | "ready" | "error";

interface Metric {
  id: "open" | "inProgress" | "today" | "waitingManager";
  titleKey: "openCallsTitle" | "inProgressTitle" | "todayTitle" | "waitingManagerTitle";
  noteKey: "openCallsNote" | "inProgressNote" | "todayNote" | "waitingManagerNote";
  icon: LucideIcon;
  value: number;
}

function flattenParts(groups: Awaited<ReturnType<typeof listPartsCatalogRequest>>): CatalogPart[] {
  return groups.flatMap((category) =>
    category.subcategories.flatMap((subcategory) =>
      subcategory.parts.map((part) => ({
        ...part,
        category: part.category ?? { id: category.id, name: category.name },
        subcategory: part.subcategory ?? { id: subcategory.id, name: subcategory.name },
      })),
    ),
  );
}

function isScheduledToday(call: ServiceCall, start: Date, end: Date): boolean {
  if (!call.scheduledAt) return false;
  const scheduledAt = new Date(call.scheduledAt);
  return scheduledAt >= start && scheduledAt <= end;
}

export function ManagementDashboardPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const canWrite = user ? hasServiceCallsWrite(user.permissions) : false;
  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);
  const todayEnd = useMemo(() => endOfLocalDay(new Date()), []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setStatus("loading");
      setError(null);

      try {
        const [nextCalls, partGroups] = await Promise.all([
          fetchAllServiceCalls(user.organization.id, accessToken),
          listPartsCatalogRequest(user.organization.id, accessToken).catch(() => []),
        ]);
        if (cancelled) return;
        setCalls(nextCalls);
        setParts(flattenParts(partGroups));
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setStatus("error");
        setError(getApiErrorMessage(cause, t("managementDashboard", "loadError")));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadToken, t, user]);

  const metrics = useMemo<Metric[]>(
    () => [
      {
        id: "open",
        titleKey: "openCallsTitle",
        noteKey: "openCallsNote",
        icon: ClipboardList,
        value: calls.filter(isActiveServiceCall).length,
      },
      {
        id: "inProgress",
        titleKey: "inProgressTitle",
        noteKey: "inProgressNote",
        icon: UsersRound,
        value: calls.filter(isInProgressServiceCall).length,
      },
      {
        id: "today",
        titleKey: "todayTitle",
        noteKey: "todayNote",
        icon: CalendarDays,
        value: calls.filter((call) => isScheduledToday(call, todayStart, todayEnd)).length,
      },
      {
        id: "waitingManager",
        titleKey: "waitingManagerTitle",
        noteKey: "waitingManagerNote",
        icon: Clock3,
        value: calls.filter(isWaitingForManager).length,
      },
    ],
    [calls, todayEnd, todayStart],
  );

  const recentCalls = useMemo(
    () =>
      [...calls].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 5),
    [calls],
  );
  const recentParts = useMemo(
    () =>
      [...parts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 4),
    [parts],
  );

  if (!user || !accessToken) return <LoadingState message={t("managementDashboard", "loading")} />;

  return (
    <div className="management-dashboard">
      <header className="management-dashboard__header">
        <div>
          <h2 className="management-dashboard__title">{t("managementDashboard", "title")}</h2>
          <p className="management-dashboard__subtitle">{t("managementDashboard", "subtitle")}</p>
        </div>
        <div className="management-dashboard__actions">
          {canWrite ? (
            <Link to="/service-calls/new" className="customers-page__action-link">
              <Button variant="primary">
                <Plus size={20} aria-hidden="true" />
                {t("managementDashboard", "newServiceCall")}
              </Button>
            </Link>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setReloadToken((value) => value + 1)}
            disabled={status === "loading"}
            aria-label={t("managementDashboard", "refresh")}
          >
            <RefreshCw size={19} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {status === "loading" ? <LoadingState message={t("managementDashboard", "loading")} /> : null}
      {status === "error" ? <p className="management-dashboard__notice">{error}</p> : null}

      {status === "ready" ? (
        <>
          <section
            className="management-dashboard__metrics"
            aria-label={t("dashboard", "metricsSection")}
          >
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.id}
                  className={`management-metric management-metric--${metric.id}`}
                >
                  <div className="management-metric__icon">
                    <Icon size={27} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="management-metric__label">
                      {t("managementDashboard", metric.titleKey)}
                    </p>
                    <p className="management-metric__value">{formatNumber(metric.value, locale)}</p>
                    <p className="management-metric__note">
                      {t("managementDashboard", metric.noteKey)}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="management-dashboard__grid">
            <article className="management-panel management-panel--calls">
              <header className="management-panel__header">
                <h3>{t("managementDashboard", "recentCallsTitle")}</h3>
                <Link to="/service-calls">
                  {t("managementDashboard", "viewAll")} <ChevronLeft size={17} />
                </Link>
              </header>
              {recentCalls.length ? (
                <div className="management-dashboard__table-wrap">
                  <table className="management-dashboard__table">
                    <thead>
                      <tr>
                        <th>{t("managementDashboard", "callNumber")}</th>
                        <th>{t("managementDashboard", "customer")}</th>
                        <th>{t("managementDashboard", "subject")}</th>
                        <th>{t("managementDashboard", "status")}</th>
                        <th>{t("managementDashboard", "date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCalls.map((call) => (
                        <tr key={call.id}>
                          <td>
                            <Link to={`/service-calls/${call.id}`}>{call.serviceCallNumber}</Link>
                          </td>
                          <td>{call.customer?.name ?? "—"}</td>
                          <td>{call.title}</td>
                          <td>
                            <ServiceCallLifecycleBadge lifecycleState={call.lifecycleState} />
                          </td>
                          <td>{formatDate(call.openedAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="management-panel__empty">{t("managementDashboard", "noCalls")}</p>
              )}
            </article>

            <div className="management-dashboard__aside">
              <article className="management-panel management-panel--overview">
                <header className="management-panel__header">
                  <h3>{t("managementDashboard", "overviewTitle")}</h3>
                </header>
                <div className="management-overview">
                  <div className="management-overview__total">
                    <strong>{formatNumber(calls.length, locale)}</strong>
                    <span>{t("managementDashboard", "totalCalls")}</span>
                  </div>
                  <ul className="management-overview__list">
                    {metrics.map((metric) => (
                      <li key={metric.id} className={`management-overview__item--${metric.id}`}>
                        <span className="management-overview__dot" aria-hidden="true" />
                        <span>{t("managementDashboard", metric.titleKey)}</span>
                        <strong>{formatNumber(metric.value, locale)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="management-panel management-panel--parts">
                <header className="management-panel__header">
                  <h3>{t("managementDashboard", "partsTitle")}</h3>
                  <Link to="/parts">
                    {t("managementDashboard", "allParts")} <ChevronLeft size={17} />
                  </Link>
                </header>
                {recentParts.length ? (
                  <div className="management-dashboard__table-wrap">
                    <table className="management-dashboard__table management-dashboard__table--compact">
                      <thead>
                        <tr>
                          <th>{t("managementDashboard", "part")}</th>
                          <th>{t("managementDashboard", "category")}</th>
                          <th>{t("managementDashboard", "partNumber")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentParts.map((part) => (
                          <tr key={part.id}>
                            <td>
                              <Package size={17} aria-hidden="true" />
                              {part.name}
                            </td>
                            <td>{part.category?.name ?? "—"}</td>
                            <td dir="ltr">{part.partNumber ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="management-panel__empty">{t("managementDashboard", "noParts")}</p>
                )}
              </article>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
