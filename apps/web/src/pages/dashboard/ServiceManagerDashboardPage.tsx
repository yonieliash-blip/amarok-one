import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OrganizationMember, ServiceCall, ServiceCallPriority } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { formatDate, formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { isApiRequestError } from "../../lib/api-client";
import { getServiceCallPriorityLabel } from "../../lib/service-call-labels";
import {
  countByBucket,
  endOfLocalDay,
  fetchAllServiceCalls,
  filterDashboardCalls,
  startOfLocalDay,
  type ServiceManagerBucket,
} from "../../lib/service-manager-dashboard";
import { buildServiceCallsListUrl } from "../../lib/service-calls-list-url";
import { hasServiceCallsWrite, listAssignableUsersRequest } from "../../lib/service-calls-api";
import type { TranslationMessages } from "../../i18n/types";

type PageStatus = "loading" | "ready" | "error";

type ServiceManagerDashboardMessages = TranslationMessages["serviceManagerDashboard"];

const BUCKET_ORDER: readonly ServiceManagerBucket[] = [
  "current",
  "waiting_assignment",
  "in_progress",
  "waiting_for_parts",
  "waiting_manager",
  "completed_today",
];

const BUCKET_I18N: Record<
  ServiceManagerBucket,
  {
    title: keyof ServiceManagerDashboardMessages;
    description: keyof ServiceManagerDashboardMessages;
  }
> = {
  current: { title: "bucketCurrentTitle", description: "bucketCurrentDescription" },
  waiting_assignment: {
    title: "bucketWaitingAssignmentTitle",
    description: "bucketWaitingAssignmentDescription",
  },
  in_progress: { title: "bucketInProgressTitle", description: "bucketInProgressDescription" },
  waiting_for_parts: {
    title: "bucketWaitingPartsTitle",
    description: "bucketWaitingPartsDescription",
  },
  waiting_manager: {
    title: "bucketWaitingManagerTitle",
    description: "bucketWaitingManagerDescription",
  },
  completed_today: {
    title: "bucketCompletedTodayTitle",
    description: "bucketCompletedTodayDescription",
  },
};

export function ServiceManagerDashboardPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [assignees, setAssignees] = useState<OrganizationMember[]>([]);
  const [activeBucket, setActiveBucket] = useState<ServiceManagerBucket>("current");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | ServiceCallPriority>("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const canWrite = user ? hasServiceCallsWrite(user.permissions) : false;

  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);
  const todayEnd = useMemo(() => endOfLocalDay(new Date()), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken) {
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const [allCalls, assigneeList] = await Promise.all([
          fetchAllServiceCalls(user.organization.id, accessToken),
          listAssignableUsersRequest(user.organization.id, accessToken).catch(() => []),
        ]);
        if (!cancelled) {
          setCalls(allCalls);
          setAssignees(assigneeList);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("serviceManagerDashboard", "loadErrorMessage"))
              : t("serviceManagerDashboard", "loadErrorMessage"),
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, t, reloadToken]);

  const requestRefresh = (): void => {
    setReloadToken((value) => value + 1);
  };

  const bucketCounts = useMemo(() => {
    const counts: Record<ServiceManagerBucket, number> = {
      current: 0,
      waiting_assignment: 0,
      in_progress: 0,
      waiting_for_parts: 0,
      waiting_manager: 0,
      completed_today: 0,
    };
    for (const bucket of BUCKET_ORDER) {
      counts[bucket] = countByBucket(calls, bucket, todayStart, todayEnd);
    }
    return counts;
  }, [calls, todayStart, todayEnd]);

  const visibleCalls = useMemo(
    () =>
      filterDashboardCalls(calls, {
        bucket: activeBucket,
        todayStart,
        todayEnd,
        search: debouncedSearch,
        priority: priorityFilter,
        assigneeId: assigneeFilter,
      }),
    [calls, activeBucket, todayStart, todayEnd, debouncedSearch, priorityFilter, assigneeFilter],
  );

  const priorityOptions: Array<{ value: "" | ServiceCallPriority; label: string }> = [
    { value: "", label: t("serviceCalls", "allPriorities") },
    ...(["low", "normal", "high", "urgent"] as const).map((value) => ({
      value,
      label: getServiceCallPriorityLabel(t, value),
    })),
  ];

  if (!user) {
    return <LoadingState message={t("serviceManagerDashboard", "loading")} />;
  }

  return (
    <div className="dashboard service-manager-dashboard">
      <section className="dashboard__hero" aria-labelledby="service-manager-dashboard-title">
        <div className="dashboard__hero-copy">
          <p className="dashboard__greeting">
            {t("dashboard", "greeting", { name: user.displayName })}
          </p>
          <p className="dashboard__eyebrow">{t("serviceManagerDashboard", "eyebrow")}</p>
          <h2 className="dashboard__title" id="service-manager-dashboard-title">
            {t("serviceManagerDashboard", "title")}
          </h2>
          <p className="dashboard__subtitle">
            {t("serviceManagerDashboard", "subtitle", { organization: user.organization.name })}
          </p>
        </div>
        <div className="service-manager-dashboard__hero-actions">
          {canWrite ? (
            <Link to="/service-calls/new" className="customers-page__action-link">
              <Button variant="primary">
                <Plus size={18} aria-hidden="true" />
                {t("serviceCalls", "addServiceCall")}
              </Button>
            </Link>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={requestRefresh}
            disabled={status === "loading"}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {t("serviceManagerDashboard", "refresh")}
          </Button>
        </div>
      </section>

      {status === "loading" ? (
        <LoadingState message={t("serviceManagerDashboard", "loading")} />
      ) : null}

      {status === "error" ? (
        <ErrorState
          title={t("serviceManagerDashboard", "loadErrorTitle")}
          message={errorMessage ?? t("serviceManagerDashboard", "loadErrorMessage")}
          onRetry={requestRefresh}
        />
      ) : null}

      {status === "ready" ? (
        <>
          <section className="dashboard__metrics" aria-labelledby="service-manager-metrics-title">
            <h2
              className="dashboard__section-title visually-hidden"
              id="service-manager-metrics-title"
            >
              {t("serviceManagerDashboard", "metricsSection")}
            </h2>
            <div className="dashboard__stats dashboard__stats--six">
              {BUCKET_ORDER.map((bucket) => {
                const isActive = activeBucket === bucket;
                const copy = BUCKET_I18N[bucket];
                return (
                  <button
                    key={bucket}
                    type="button"
                    className={`dashboard__stat-card amarok-card dashboard__stat-card--selectable${isActive ? " dashboard__stat-card--active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveBucket(bucket)}
                  >
                    <h3 className="amarok-card__title">
                      {t("serviceManagerDashboard", copy.title)}
                    </h3>
                    <p className="amarok-card__description">
                      {t("serviceManagerDashboard", copy.description)}
                    </p>
                    <p className="dashboard__stat-value">
                      {formatNumber(bucketCounts[bucket], locale)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="service-manager-dashboard__workspace" aria-labelledby="queue-title">
            <div className="service-manager-dashboard__workspace-header">
              <div>
                <h2 className="dashboard__section-title" id="queue-title">
                  {t("serviceManagerDashboard", BUCKET_I18N[activeBucket].title)}
                </h2>
                <p className="service-manager-dashboard__queue-meta">
                  {visibleCalls.length === 1
                    ? t("serviceManagerDashboard", "queueCountOne", {
                        count: formatNumber(visibleCalls.length, locale),
                      })
                    : t("serviceManagerDashboard", "queueCountMany", {
                        count: formatNumber(visibleCalls.length, locale),
                      })}
                </p>
              </div>
              <Link
                to={buildServiceCallsListUrl({
                  bucket: activeBucket,
                  search: debouncedSearch,
                  priority: priorityFilter,
                  assigneeId: assigneeFilter,
                })}
                className="service-manager-dashboard__view-all"
              >
                {t("serviceManagerDashboard", "viewAllServiceCalls")}
              </Link>
            </div>

            <div className="customers-page__filters service-manager-dashboard__filters">
              <label className="customers-page__filter">
                <span className="visually-hidden">{t("serviceCalls", "searchLabel")}</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("serviceManagerDashboard", "searchPlaceholder")}
                  className="customers-page__search"
                />
              </label>
              <label className="customers-page__filter">
                <span>{t("serviceCalls", "priorityFilter")}</span>
                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value as "" | ServiceCallPriority)
                  }
                >
                  {priorityOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="customers-page__filter">
                <span>{t("serviceCalls", "assigneeFilter")}</span>
                <select
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                >
                  <option value="">{t("serviceCalls", "allAssignees")}</option>
                  <option value="unassigned">{t("serviceCalls", "unassigned")}</option>
                  {assignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleCalls.length === 0 ? (
              <EmptyState
                title={t("serviceManagerDashboard", "emptyQueueTitle")}
                message={t("serviceManagerDashboard", "emptyQueueMessage")}
              />
            ) : (
              <div className="customers-table-wrap service-manager-dashboard__table-wrap">
                <table className="customers-table">
                  <thead>
                    <tr>
                      <th>{t("serviceCalls", "tableNumber")}</th>
                      <th>{t("serviceCalls", "tableTitle")}</th>
                      <th>{t("serviceCalls", "tableCustomer")}</th>
                      <th>{t("serviceCalls", "tableAssignee")}</th>
                      <th>{t("serviceManagerDashboard", "lifecycleColumn")}</th>
                      <th>{t("serviceCalls", "tablePriority")}</th>
                      <th>{t("serviceCalls", "tableOpened")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCalls.map((call) => (
                      <tr key={call.id}>
                        <td>
                          <Link to={`/service-calls/${call.id}`} className="customers-table__link">
                            {call.serviceCallNumber}
                          </Link>
                        </td>
                        <td>
                          <Link to={`/service-calls/${call.id}`} className="customers-table__link">
                            {call.title}
                          </Link>
                        </td>
                        <td>{call.customer?.name ?? t("common", "emptyValue")}</td>
                        <td>{call.assignedUser?.displayName ?? t("serviceCalls", "unassigned")}</td>
                        <td>
                          <ServiceCallLifecycleBadge lifecycleState={call.lifecycleState} />
                        </td>
                        <td>
                          <ServiceCallPriorityBadge priority={call.priority} />
                        </td>
                        <td>{formatDate(call.openedAt, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export function ServiceDashboardPage() {
  return <ServiceManagerDashboardPage />;
}
