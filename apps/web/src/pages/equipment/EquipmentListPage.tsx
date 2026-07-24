import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Customer, Equipment, EquipmentStatus, EquipmentType } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { EquipmentStatusBadge } from "../../components/EquipmentStatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listCustomersRequest } from "../../lib/customers-api";
import { getEquipmentStatusLabel } from "../../lib/equipment-status";
import {
  hasEquipmentWrite,
  listEquipmentRequest,
  listEquipmentTypesRequest,
} from "../../lib/equipment-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "error";

export function EquipmentListPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const statusOptions: Array<{ value: "" | EquipmentStatus; label: string }> = [
    { value: "", label: t("equipment", "allStatuses") },
    ...(["active", "in_service", "out_of_service", "retired"] as const).map((value) => ({
      value,
      label: getEquipmentStatusLabel(t, value),
    })),
  ];
  const [status, setStatus] = useState<PageStatus>("loading");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EquipmentStatus>("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedManufacturer, setDebouncedManufacturer] = useState("");
  const [debouncedModel, setDebouncedModel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const canWrite = user ? hasEquipmentWrite(user.permissions) : false;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedManufacturer(manufacturerFilter), 300);
    return () => window.clearTimeout(timer);
  }, [manufacturerFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedModel(modelFilter), 300);
    return () => window.clearTimeout(timer);
  }, [modelFilter]);

  useEffect(() => {
    if (!user || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadFilters(): Promise<void> {
      try {
        const [types, customerResult] = await Promise.all([
          listEquipmentTypesRequest(user!.organization.id, accessToken!),
          listCustomersRequest(user!.organization.id, accessToken!, { pageSize: 100 }),
        ]);
        if (!cancelled) {
          setEquipmentTypes(types);
          setCustomers(customerResult.data);
        }
      } catch {
        /* filter options are optional */
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
      if (!user || !accessToken) {
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const result = await listEquipmentRequest(user.organization.id, accessToken, {
          search: debouncedSearch,
          status: statusFilter,
          customerId: customerFilter || undefined,
          equipmentTypeId: typeFilter || undefined,
          manufacturer: debouncedManufacturer,
          model: debouncedModel,
          pageSize: 50,
        });
        if (!cancelled) {
          setEquipment(result.data);
          setTotal(result.meta?.total ?? result.data.length);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("equipment", "loadErrorMessage"))
              : t("equipment", "loadErrorMessage"),
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
    customerFilter,
    typeFilter,
    debouncedManufacturer,
    debouncedModel,
    t,
  ]);

  const reloadEquipment = useCallback(async () => {
    if (!user || !accessToken) {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const result = await listEquipmentRequest(user.organization.id, accessToken, {
        search: debouncedSearch,
        status: statusFilter,
        customerId: customerFilter || undefined,
        equipmentTypeId: typeFilter || undefined,
        manufacturer: debouncedManufacturer,
        model: debouncedModel,
        pageSize: 50,
      });
      setEquipment(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipment", "loadErrorMessage"))
          : t("equipment", "loadErrorMessage"),
      );
      setStatus("error");
    }
  }, [
    user,
    accessToken,
    debouncedSearch,
    statusFilter,
    customerFilter,
    typeFilter,
    debouncedManufacturer,
    debouncedModel,
    t,
  ]);

  if (!user || !accessToken) {
    return <LoadingState message={t("equipment", "loading")} />;
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("equipment", "assetsEyebrow")}</p>
          <h2 className="customers-page__title">{t("equipment", "title")}</h2>
          <p className="customers-page__subtitle">
            {t("equipment", "subtitle", { organization: user.organization.name })}
          </p>
        </div>
        {canWrite ? (
          <Link to="/equipment/new" className="customers-page__action-link">
            <Button variant="primary">{t("equipment", "addEquipment")}</Button>
          </Link>
        ) : null}
      </header>

      <section className="customers-toolbar">
        <label className="customers-toolbar__search">
          <span className="visually-hidden">{t("equipment", "searchLabel")}</span>
          <input
            type="search"
            placeholder={t("equipment", "searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("equipment", "statusFilter")}</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | EquipmentStatus)}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("equipment", "typeFilter")}</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">{t("equipment", "allTypes")}</option>
            {equipmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("equipment", "customerFilter")}</span>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
          >
            <option value="">{t("equipment", "allCustomers")}</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("equipment", "manufacturerFilter")}</span>
          <input
            type="search"
            placeholder={t("equipment", "manufacturerPlaceholder")}
            value={manufacturerFilter}
            onChange={(event) => setManufacturerFilter(event.target.value)}
          />
        </label>

        <label className="customers-toolbar__filter">
          <span>{t("equipment", "modelFilter")}</span>
          <input
            type="search"
            placeholder={t("equipment", "modelPlaceholder")}
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
          />
        </label>
      </section>

      {status === "loading" ? <LoadingState message={t("equipment", "loading")} /> : null}

      {status === "error" ? (
        <ErrorState
          title={t("equipment", "loadErrorTitle")}
          message={errorMessage ?? t("equipment", "loadErrorMessage")}
          onRetry={() => void reloadEquipment()}
        />
      ) : null}

      {status === "ready" && equipment.length === 0 ? (
        <EmptyState
          title={t("equipment", "emptyTitle")}
          message={
            debouncedSearch ||
            statusFilter ||
            customerFilter ||
            typeFilter ||
            debouncedManufacturer ||
            debouncedModel
              ? t("equipment", "emptyFilteredMessage")
              : t("equipment", "emptyDefaultMessage")
          }
          icon="◎"
        />
      ) : null}

      {status === "ready" && equipment.length > 0 ? (
        <>
          <p className="customers-page__count">
            {total === 1
              ? t("equipment", "countOne", { count: formatNumber(total, locale) })
              : t("equipment", "countMany", { count: formatNumber(total, locale) })}
          </p>
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>{t("equipment", "tableName")}</th>
                  <th>{t("equipment", "tableNumber")}</th>
                  <th>{t("equipment", "tableType")}</th>
                  <th>{t("equipment", "tableManufacturer")}</th>
                  <th>{t("equipment", "tableCustomer")}</th>
                  <th>{t("equipment", "tableStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/equipment/${item.id}`} className="customers-table__link">
                        <strong>{item.name}</strong>
                        {item.location ? (
                          <span className="customers-table__muted">{item.location}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td dir="ltr">{item.internalNumber}</td>
                    <td>{item.equipmentType?.name ?? t("common", "emptyValue")}</td>
                    <td>
                      {[item.manufacturer, item.model].filter(Boolean).join(" · ") ||
                        t("common", "emptyValue")}
                    </td>
                    <td>
                      {item.customer ? (
                        <Link
                          to={`/customers/${item.customer.id}`}
                          className="customers-table__link"
                        >
                          {item.customer.name}
                        </Link>
                      ) : (
                        t("common", "emptyValue")
                      )}
                    </td>
                    <td>
                      <EquipmentStatusBadge status={item.status} />
                    </td>
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
