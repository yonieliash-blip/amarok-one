import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type {
  Customer,
  OrganizationMember,
  ServiceCall,
  ServiceCallLifecycleState,
  ServiceCallPriority,
  ServiceCallStatus,
} from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate, formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listCustomersRequest } from "../../lib/customers-api";
import { getServiceCallLifecycleLabel } from "../../lib/service-call-lifecycle-labels";
import {
  getServiceCallPriorityLabel,
  getServiceCallStatusLabel,
} from "../../lib/service-call-labels";
import {
  hasServiceCallsWrite,
  listAssignableUsersRequest,
  listServiceCallsRequest,
} from "../../lib/service-calls-api";
import { isApiRequestError } from "../../lib/api-client";
import {
  fetchAllServiceCalls,
  filterDashboardCalls,
  startOfLocalDay,
  endOfLocalDay,
  type ServiceManagerBucket,
} from "../../lib/service-manager-dashboard";
import { parseServiceCallsListSearchParams } from "../../lib/service-calls-list-url";
import type { TranslationMessages } from "../../i18n/types";

type PageStatus = "loading" | "ready" | "error";

const LIFECYCLE_FILTER_ORDER: readonly ServiceCallLifecycleState[] = [
  "new",
  "waiting_assignment",
  "assigned",
  "driving",
  "working",
  "waiting_for_parts",
  "waiting_customer",
  "waiting_specialist",
  "waiting_manager_closure",
  "closed",
];

const DASHBOARD_BUCKET_TITLE_KEYS = {
  current: "bucketCurrentTitle",
  waiting_assignment: "bucketWaitingAssignmentTitle",
  in_progress: "bucketInProgressTitle",
  waiting_for_parts: "bucketWaitingPartsTitle",
  waiting_manager: "bucketWaitingManagerTitle",
  completed_today: "bucketCompletedTodayTitle",
} as const satisfies Record<
  ServiceManagerBucket,
  keyof TranslationMessages["serviceManagerDashboard"]
>;

export function ServiceCallsListPage({ scope = "all" }: { scope?: "all" | "mine" }) {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMine = scope === "mine";
  const [status, setStatus] = useState<PageStatus>("loading");
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignees, setAssignees] = useState<OrganizationMember[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ServiceCallStatus>("");
  const [lifecycleFilter, setLifecycleFilter] = useState<"" | ServiceCallLifecycleState>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | ServiceCallPriority>("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [openedFrom, setOpenedFrom] = useState("");
  const [openedTo, setOpenedTo] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const urlFilters = useMemo(
    () => (isMine ? {} : parseServiceCallsListSearchParams(searchParams)),
    [isMine, searchParams],
  );
  const dashboardBucket = urlFilters.bucket ?? "";

  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);
  const todayEnd = useMemo(() => endOfLocalDay(new Date()), []);

  const canWrite = !isMine && user ? hasServiceCallsWrite(user.permissions) : false;

  const statusOptions: Array<{ value: "" | ServiceCallStatus; label: string }> = [
    { value: "", label: t("serviceCalls", "allStatuses") },
    ...(
      ["open", "scheduled", "in_progress", "waiting_for_parts", "completed", "cancelled"] as const
    ).map((value) => ({ value, label: getServiceCallStatusLabel(t, value) })),
  ];

  const lifecycleOptions: Array<{ value: "" | ServiceCallLifecycleState; label: string }> = [
    { value: "", label: t("serviceCalls", "allLifecycleStates") },
    ...LIFECYCLE_FILTER_ORDER.map((value) => ({
      value,
      label: getServiceCallLifecycleLabel(t, value),
    })),
  ];

  const priorityOptions: Array<{ value: "" | ServiceCallPriority; label: string }> = [
    { value: "", label: t("serviceCalls", "allPriorities") },
    ...(["low", "normal", "high", "urgent"] as const).map((value) => ({
      value,
      label: getServiceCallPriorityLabel(t, value),
    })),
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const clearDashboardFilter = useCallback((): void => {
    const next = new URLSearchParams(searchParams);
    next.delete("bucket");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const dashboardBucketTitle = dashboardBucket
    ? t("serviceManagerDashboard", DASHBOARD_BUCKET_TITLE_KEYS[dashboardBucket])
    : null;

  useEffect(() => {
    if (!user || !accessToken) return;

    let cancelled = false;

    async function loadFilters(): Promise<void> {
      try {
        const [customerResult, assigneeList] = await Promise.all([
          listCustomersRequest(user!.organization.id, accessToken!, { pageSize: 100 }),
          listAssignableUsersRequest(user!.organization.id, accessToken!),
        ]);
        if (!cancelled) {
          setCustomers(customerResult.data);
          setAssignees(assigneeList);
        }
      } catch {
        /* optional */
      }
    }

    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken) return;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const activeSearch = dashboardBucket ? (urlFilters.search ?? "") : debouncedSearch;
        const activePriority = dashboardBucket ? (urlFilters.priority ?? "") : priorityFilter;
        const activeAssignee = dashboardBucket ? (urlFilters.assigneeId ?? "") : assigneeFilter;

        if (dashboardBucket && !isMine) {
          const allCalls = await fetchAllServiceCalls(user.organization.id, accessToken);
          const filtered = filterDashboardCalls(allCalls, {
            bucket: dashboardBucket,
            todayStart,
            todayEnd,
            search: activeSearch,
            priority: activePriority,
            assigneeId: activeAssignee,
          });
          if (!cancelled) {
            setServiceCalls(filtered);
            setTotal(filtered.length);
            setStatus("ready");
          }
          return;
        }

        const assignedUserId = isMine
          ? user.id
          : assigneeFilter && assigneeFilter !== "unassigned"
            ? assigneeFilter
            : undefined;

        const result = await listServiceCallsRequest(user.organization.id, accessToken, {
          search: debouncedSearch,
          status: statusFilter,
          lifecycleState: lifecycleFilter,
          priority: priorityFilter,
          customerId: customerFilter || undefined,
          assignedUserId,
          openedFrom: openedFrom ? `${openedFrom}T00:00:00.000Z` : undefined,
          openedTo: openedTo ? `${openedTo}T23:59:59.999Z` : undefined,
          pageSize: 50,
        });
        let data = result.data;
        if (assigneeFilter === "unassigned") {
          data = data.filter((call) => !call.assignedUserId);
        }
        if (!cancelled) {
          setServiceCalls(data);
          setTotal(result.meta?.total ?? data.length);
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
  }, [
    user,
    accessToken,
    debouncedSearch,
    statusFilter,
    lifecycleFilter,
    priorityFilter,
    customerFilter,
    assigneeFilter,
    openedFrom,
    openedTo,
    dashboardBucket,
    urlFilters,
    todayStart,
    todayEnd,
    isMine,
    t,
  ]);

  const reloadServiceCalls = useCallback(async () => {
    if (!user || !accessToken) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const activeSearch = dashboardBucket ? (urlFilters.search ?? "") : debouncedSearch;
      const activePriority = dashboardBucket ? (urlFilters.priority ?? "") : priorityFilter;
      const activeAssignee = dashboardBucket ? (urlFilters.assigneeId ?? "") : assigneeFilter;

      if (dashboardBucket && !isMine) {
        const allCalls = await fetchAllServiceCalls(user.organization.id, accessToken);
        const filtered = filterDashboardCalls(allCalls, {
          bucket: dashboardBucket,
          todayStart,
          todayEnd,
          search: activeSearch,
          priority: activePriority,
          assigneeId: activeAssignee,
        });
        setServiceCalls(filtered);
        setTotal(filtered.length);
        setStatus("ready");
        return;
      }

      const assignedUserId = isMine
        ? user.id
        : assigneeFilter && assigneeFilter !== "unassigned"
          ? assigneeFilter
          : undefined;

      const result = await listServiceCallsRequest(user.organization.id, accessToken, {
        search: debouncedSearch,
        status: statusFilter,
        lifecycleState: lifecycleFilter,
        priority: priorityFilter,
        customerId: customerFilter || undefined,
        assignedUserId,
        openedFrom: openedFrom ? `${openedFrom}T00:00:00.000Z` : undefined,
        openedTo: openedTo ? `${openedTo}T23:59:59.999Z` : undefined,
        pageSize: 50,
      });
      let data = result.data;
      if (assigneeFilter === "unassigned") {
        data = data.filter((call) => !call.assignedUserId);
      }
      setServiceCalls(data);
      setTotal(result.meta?.total ?? data.length);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("serviceCalls", "loadErrorMessage"))
          : t("serviceCalls", "loadErrorMessage"),
      );
      setStatus("error");
    }
  }, [
    user,
    accessToken,
    debouncedSearch,
    statusFilter,
    lifecycleFilter,
    priorityFilter,
    customerFilter,
    assigneeFilter,
    openedFrom,
    openedTo,
    dashboardBucket,
    urlFilters,
    todayStart,
    todayEnd,
    isMine,
    t,
  ]);

  if (!user || !accessToken) {
    return <LoadingState message={t("serviceCalls", "loading")} />;
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">
            {isMine ? t("serviceCalls", "myCallsEyebrow") : t("serviceCalls", "callsEyebrow")}
          </p>
          <h2 className="customers-page__title">
            {isMine ? t("serviceCalls", "myTitle") : t("serviceCalls", "title")}
          </h2>
          <p className="customers-page__subtitle">
            {t("serviceCalls", "subtitle", { organization: user.organization.name })}
          </p>
        </div>
        {canWrite ? (
          <Link to="/service-calls/new" className="customers-page__action-link">
            <Button variant="primary">{t("serviceCalls", "addServiceCall")}</Button>
          </Link>
        ) : null}
      </header>

      {dashboardBucket && dashboardBucketTitle ? (
        <div
          className="customers-alert customers-alert--info service-calls-list__dashboard-filter"
          role="status"
        >
          <span>
            {t("serviceCalls", "dashboardFilterActive", { bucket: dashboardBucketTitle })}
          </span>
          <Button type="button" variant="secondary" onClick={clearDashboardFilter}>
            {t("serviceCalls", "clearDashboardFilter")}
          </Button>
        </div>
      ) : null}

      <section className="customers-toolbar">
        <label className="customers-toolbar__search">
          <span className="visually-hidden">{t("serviceCalls", "searchLabel")}</span>
          <input
            type="search"
            placeholder={t("serviceCalls", "searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("serviceCalls", "statusFilter")}</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | ServiceCallStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {!isMine ? (
          <label className="customers-toolbar__filter">
            <span>{t("serviceCalls", "lifecycleFilter")}</span>
            <select
              value={lifecycleFilter}
              onChange={(event) =>
                setLifecycleFilter(event.target.value as "" | ServiceCallLifecycleState)
              }
            >
              {lifecycleOptions.map((option) => (
                <option key={option.value || "all-lifecycle"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="customers-toolbar__filter">
          <span>{t("serviceCalls", "priorityFilter")}</span>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as "" | ServiceCallPriority)}
          >
            {priorityOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("serviceCalls", "customerFilter")}</span>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
          >
            <option value="">{t("serviceCalls", "allCustomers")}</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        {!isMine ? (
          <label className="customers-toolbar__filter">
            <span>{t("serviceCalls", "assigneeFilter")}</span>
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
            >
              <option value="">{t("serviceCalls", "allAssignees")}</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="customers-toolbar__filter">
          <span>{t("serviceCalls", "openedFrom")}</span>
          <input
            type="date"
            dir="ltr"
            value={openedFrom}
            onChange={(e) => setOpenedFrom(e.target.value)}
          />
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("serviceCalls", "openedTo")}</span>
          <input
            type="date"
            dir="ltr"
            value={openedTo}
            onChange={(e) => setOpenedTo(e.target.value)}
          />
        </label>
      </section>

      {status === "loading" ? <LoadingState message={t("serviceCalls", "loading")} /> : null}

      {status === "error" ? (
        <ErrorState
          title={t("serviceCalls", "loadErrorTitle")}
          message={errorMessage ?? t("serviceCalls", "loadErrorMessage")}
          onRetry={() => void reloadServiceCalls()}
        />
      ) : null}

      {status === "ready" && serviceCalls.length === 0 ? (
        <EmptyState
          title={t("serviceCalls", "emptyTitle")}
          message={
            debouncedSearch ||
            statusFilter ||
            priorityFilter ||
            customerFilter ||
            assigneeFilter ||
            openedFrom ||
            openedTo
              ? t("serviceCalls", "emptyFilteredMessage")
              : t("serviceCalls", "emptyDefaultMessage")
          }
          icon="◎"
        />
      ) : null}

      {status === "ready" && serviceCalls.length > 0 ? (
        <>
          <p className="customers-page__count">
            {total === 1
              ? t("serviceCalls", "countOne", { count: formatNumber(total, locale) })
              : t("serviceCalls", "countMany", { count: formatNumber(total, locale) })}
          </p>
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>{t("serviceCalls", "tableNumber")}</th>
                  <th>{t("serviceCalls", "tableTitle")}</th>
                  <th>{t("serviceCalls", "tableCustomer")}</th>
                  <th>{t("serviceCalls", "tableEquipment")}</th>
                  <th>{t("serviceCalls", "tableAssignee")}</th>
                  <th>{t("serviceCalls", "lifecycleColumn")}</th>
                  <th>{t("serviceCalls", "tablePriority")}</th>
                  <th>{t("serviceCalls", "tableOpened")}</th>
                </tr>
              </thead>
              <tbody>
                {serviceCalls.map((call) => (
                  <tr key={call.id}>
                    <td dir="ltr">
                      <Link to={`/service-calls/${call.id}`} className="customers-table__link">
                        {call.serviceCallNumber}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/service-calls/${call.id}`} className="customers-table__link">
                        <strong>{call.title}</strong>
                      </Link>
                    </td>
                    <td>{call.customer?.name ?? t("common", "emptyValue")}</td>
                    <td>{call.equipment?.name ?? t("common", "emptyValue")}</td>
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
        </>
      ) : null}
    </div>
  );
}
