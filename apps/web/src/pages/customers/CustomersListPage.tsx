import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Customer, CustomerStatus } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { CustomerStatusBadge } from "../../components/CustomerStatusBadge";
import { getCustomerStatusLabel } from "../../lib/customer-status";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatNumber, formatPhone } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  hasCustomersWrite,
  listCustomersRequest,
  type CustomerSortField,
  type CustomerSortOrder,
} from "../../lib/customers-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "error";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function CustomersListPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const statusOptions: Array<{ value: "" | CustomerStatus; label: string }> = [
    { value: "", label: t("customers", "allStatuses") },
    ...(["active", "inactive", "prospect"] as const).map((value) => ({
      value,
      label: getCustomerStatusLabel(t, value),
    })),
  ];
  const sortOptions: Array<{ value: CustomerSortField; label: string }> = [
    { value: "createdAt", label: t("customers", "sortCreatedAt") },
    { value: "name", label: t("customers", "sortName") },
    { value: "customerNumber", label: t("customers", "sortCustomerNumber") },
    { value: "status", label: t("customers", "sortStatus") },
    { value: "city", label: t("customers", "sortCity") },
  ];
  const [status, setStatus] = useState<PageStatus>("loading");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CustomerStatus>("");
  const [sortBy, setSortBy] = useState<CustomerSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<CustomerSortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const canWrite = user ? hasCustomersWrite(user.permissions) : false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
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
        const result = await listCustomersRequest(user.organization.id, accessToken, {
          search: debouncedSearch,
          status: statusFilter,
          sortBy,
          sortOrder,
          page,
          pageSize,
        });
        if (!cancelled) {
          setCustomers(result.data);
          setTotal(result.meta?.total ?? result.data.length);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("customers", "loadErrorMessage"))
              : t("customers", "loadErrorMessage"),
          );
          setStatus("error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, debouncedSearch, statusFilter, sortBy, sortOrder, page, pageSize, t]);

  const reloadCustomers = useCallback(async () => {
    if (!user || !accessToken) {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const result = await listCustomersRequest(user.organization.id, accessToken, {
        search: debouncedSearch,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
      setCustomers(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "loadErrorMessage"))
          : t("customers", "loadErrorMessage"),
      );
      setStatus("error");
    }
  }, [user, accessToken, debouncedSearch, statusFilter, sortBy, sortOrder, page, pageSize, t]);

  if (!user || !accessToken) {
    return <LoadingState message={t("customers", "loading")} />;
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("customers", "accountsEyebrow")}</p>
          <h2 className="customers-page__title">{t("customers", "title")}</h2>
          <p className="customers-page__subtitle">
            {t("customers", "subtitle", { organization: user.organization.name })}
          </p>
        </div>
        {canWrite ? (
          <Link to="/customers/new" className="customers-page__action-link">
            <Button variant="primary">{t("customers", "addCustomer")}</Button>
          </Link>
        ) : null}
      </header>

      <section className="customers-toolbar">
        <label className="customers-toolbar__search">
          <span className="visually-hidden">{t("customers", "searchLabel")}</span>
          <input
            type="search"
            placeholder={t("customers", "searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("customers", "statusFilter")}</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value as "" | CustomerStatus);
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("customers", "sortBy")}</span>
          <select
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as CustomerSortField);
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("customers", "sortOrder")}</span>
          <select
            value={sortOrder}
            onChange={(event) => {
              setPage(1);
              setSortOrder(event.target.value as CustomerSortOrder);
            }}
          >
            <option value="asc">{t("customers", "sortAscending")}</option>
            <option value="desc">{t("customers", "sortDescending")}</option>
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("customers", "pageSize")}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      {status === "loading" ? <LoadingState message={t("customers", "loading")} /> : null}

      {status === "error" ? (
        <ErrorState
          title={t("customers", "loadErrorTitle")}
          message={errorMessage ?? t("customers", "loadErrorMessage")}
          onRetry={() => void reloadCustomers()}
        />
      ) : null}

      {status === "ready" && customers.length === 0 ? (
        <EmptyState
          title={t("customers", "emptyTitle")}
          message={
            debouncedSearch || statusFilter
              ? t("customers", "emptyFilteredMessage")
              : t("customers", "emptyDefaultMessage")
          }
          icon="◎"
        />
      ) : null}

      {status === "ready" && customers.length > 0 ? (
        <>
          <p className="customers-page__count">
            {total === 1
              ? t("customers", "countOne", { count: formatNumber(total, locale) })
              : t("customers", "countMany", { count: formatNumber(total, locale) })}
          </p>
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>{t("customers", "tableCustomer")}</th>
                  <th>{t("customers", "tableNumber")}</th>
                  <th>{t("customers", "tableLocation")}</th>
                  <th>{t("customers", "tableStatus")}</th>
                  <th>{t("customers", "tableContact")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link to={`/customers/${customer.id}`} className="customers-table__link">
                        <strong>{customer.name}</strong>
                        {customer.legalName ? (
                          <span className="customers-table__muted">{customer.legalName}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td dir="ltr">{customer.customerNumber}</td>
                    <td>
                      {[customer.city, customer.country].filter(Boolean).join(", ") ||
                        t("common", "emptyValue")}
                    </td>
                    <td>
                      <CustomerStatusBadge status={customer.status} />
                    </td>
                    <td>
                      <div className="customers-table__contact">
                        {customer.email ? <span dir="ltr">{customer.email}</span> : null}
                        {customer.phone ? (
                          <span dir="ltr">{formatPhone(customer.phone, locale)}</span>
                        ) : null}
                        {!customer.email && !customer.phone ? t("common", "emptyValue") : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="customers-pagination" aria-label={t("customers", "paginationLabel")}>
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("customers", "previousPage")}
            </Button>
            <span className="customers-pagination__status">
              {t("customers", "pageStatus", {
                page: formatNumber(page, locale),
                totalPages: formatNumber(totalPages, locale),
              })}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("customers", "nextPage")}
            </Button>
          </nav>
        </>
      ) : null}
    </div>
  );
}
