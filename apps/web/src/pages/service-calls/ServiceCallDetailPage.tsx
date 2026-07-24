import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { OrganizationMember, ServiceCall, ServiceCallStatus } from "@amarok-one/types";
import {
  canManageServiceCalls,
  canWriteServiceCalls,
  extractPermissionSlugs,
  isAssignedServiceCallsOnly,
} from "@amarok-one/permissions";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { ServiceCallStatusBadge } from "../../components/ServiceCallStatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate, formatPhone } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { getServiceCallStatusLabel } from "../../lib/service-call-labels";
import {
  deleteServiceCallRequest,
  getServiceCallRequest,
  listAssignableUsersRequest,
  updateServiceCallRequest,
} from "../../lib/service-calls-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "error" | "deleting" | "updating";

export function ServiceCallDetailPage() {
  const { serviceCallId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [serviceCall, setServiceCall] = useState<ServiceCall | null>(null);
  const [assignees, setAssignees] = useState<OrganizationMember[]>([]);
  const [quickStatus, setQuickStatus] = useState<ServiceCallStatus>("open");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const permissionSlugs = user ? extractPermissionSlugs(user.permissions) : [];
  const canManage = canManageServiceCalls(permissionSlugs);
  const canUpdateStatus =
    canWriteServiceCalls(permissionSlugs) &&
    (canManage || isAssignedServiceCallsOnly(permissionSlugs));
  const listBackPath = canManage ? "/service-calls" : "/my/service-calls";
  const emptyValue = t("common", "emptyValue");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken || !serviceCallId) return;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const detail = await getServiceCallRequest(
          user.organization.id,
          serviceCallId,
          accessToken,
        );
        const assigneeList = canManage
          ? await listAssignableUsersRequest(user.organization.id, accessToken)
          : [];
        if (!cancelled) {
          setServiceCall(detail);
          setQuickStatus(detail.status);
          setQuickAssignee(detail.assignedUserId ?? "");
          setAssignees(assigneeList);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("serviceCalls", "loadCallError"))
              : t("serviceCalls", "loadCallError"),
          );
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, serviceCallId, t, canManage]);

  const reloadServiceCall = useCallback(async () => {
    if (!user || !accessToken || !serviceCallId) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const detail = await getServiceCallRequest(user.organization.id, serviceCallId, accessToken);
      setServiceCall(detail);
      setQuickStatus(detail.status);
      setQuickAssignee(detail.assignedUserId ?? "");
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("serviceCalls", "loadCallError"))
          : t("serviceCalls", "loadCallError"),
      );
      setStatus("error");
    }
  }, [user, accessToken, serviceCallId, t]);

  async function handleDelete(): Promise<void> {
    if (!user || !accessToken || !serviceCallId || !serviceCall) return;

    const confirmed = window.confirm(
      t("serviceCalls", "deleteConfirm", { name: serviceCall.title }),
    );
    if (!confirmed) return;

    setStatus("deleting");
    try {
      await deleteServiceCallRequest(user.organization.id, serviceCallId, accessToken);
      navigate(listBackPath);
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("serviceCalls", "deleteCallError"))
          : t("serviceCalls", "deleteCallError"),
      );
      setStatus("ready");
    }
  }

  async function handleQuickUpdate(field: "status" | "assignee"): Promise<void> {
    if (!user || !accessToken || !serviceCallId || !serviceCall) return;

    setStatus("updating");
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateServiceCallRequest(
        user.organization.id,
        serviceCallId,
        accessToken,
        field === "status" ? { status: quickStatus } : { assignedUserId: quickAssignee || null },
      );
      setServiceCall(updated);
      setQuickStatus(updated.status);
      setQuickAssignee(updated.assignedUserId ?? "");
      setActionMessage(t("serviceCalls", "actionSuccess"));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("serviceCalls", "actionError"))
          : t("serviceCalls", "actionError"),
      );
      setStatus("ready");
    }
  }

  if (!user || !accessToken) {
    return <LoadingState message={t("serviceCalls", "loading")} />;
  }

  if (status === "loading" || status === "deleting") {
    return (
      <LoadingState
        message={
          status === "deleting" ? t("serviceCalls", "deleting") : t("serviceCalls", "loading")
        }
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        title={t("serviceCalls", "loadErrorTitle")}
        message={errorMessage ?? t("serviceCalls", "loadCallError")}
        onRetry={() => void reloadServiceCall()}
      />
    );
  }

  if (!serviceCall) {
    return (
      <EmptyState
        title={t("serviceCalls", "notFoundTitle")}
        message={t("serviceCalls", "notFoundMessage")}
        icon="◎"
      />
    );
  }

  const statusOptions: ServiceCallStatus[] = [
    "open",
    "scheduled",
    "in_progress",
    "waiting_for_parts",
    "completed",
    "cancelled",
  ];

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("serviceCalls", "callEyebrow")}</p>
          <h2 className="customers-page__title">{serviceCall.title}</h2>
          <div className="customers-page__meta">
            <ServiceCallStatusBadge status={serviceCall.status} />
            <ServiceCallPriorityBadge priority={serviceCall.priority} />
            <span dir="ltr">{serviceCall.serviceCallNumber}</span>
          </div>
        </div>
        <div className="customers-page__actions">
          <Link to={listBackPath}>
            <Button variant="secondary">{t("serviceCalls", "backToList")}</Button>
          </Link>
          {canManage ? (
            <>
              <Link to={`/service-calls/${serviceCall.id}/edit`}>
                <Button variant="primary">{t("common", "edit")}</Button>
              </Link>
              <Button variant="secondary" onClick={() => void handleDelete()}>
                {t("common", "delete")}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="customers-alert customers-alert--error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="customers-alert customers-alert--success" role="status">
          {actionMessage}
        </div>
      ) : null}

      {canUpdateStatus ? (
        <section className="customer-detail-card customer-detail-card--wide">
          <h3>{t("serviceCalls", "quickActions")}</h3>
          <div className="customers-toolbar">
            <label className="customers-toolbar__filter">
              <span>{t("serviceCalls", "updateStatus")}</span>
              <select
                value={quickStatus}
                onChange={(event) => setQuickStatus(event.target.value as ServiceCallStatus)}
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {getServiceCallStatusLabel(t, value)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={status === "updating"}
              onClick={() => void handleQuickUpdate("status")}
            >
              {t("serviceCalls", "saveChanges")}
            </Button>

            {canManage ? (
              <>
                <label className="customers-toolbar__filter">
                  <span>{t("serviceCalls", "assignTechnician")}</span>
                  <select
                    value={quickAssignee}
                    onChange={(event) => setQuickAssignee(event.target.value)}
                  >
                    <option value="">{t("serviceCalls", "noAssignee")}</option>
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="secondary"
                  disabled={status === "updating"}
                  onClick={() => void handleQuickUpdate("assignee")}
                >
                  {t("serviceCalls", "assignTechnician")}
                </Button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="customer-detail-grid">
        <section className="customer-detail-card">
          <h3>{t("serviceCalls", "detailsSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("serviceCalls", "description")}</dt>
              <dd>{serviceCall.description ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "location")}</dt>
              <dd>{serviceCall.location ?? emptyValue}</dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card">
          <h3>{t("serviceCalls", "schedulingSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("serviceCalls", "openedAt")}</dt>
              <dd>{formatDate(serviceCall.openedAt, locale)}</dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "scheduledAt")}</dt>
              <dd>
                {serviceCall.scheduledAt ? formatDate(serviceCall.scheduledAt, locale) : emptyValue}
              </dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "completedAt")}</dt>
              <dd>
                {serviceCall.completedAt ? formatDate(serviceCall.completedAt, locale) : emptyValue}
              </dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card">
          <h3>{t("serviceCalls", "assignmentSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("serviceCalls", "customer")}</dt>
              <dd>
                {serviceCall.customer ? (
                  <Link to={`/customers/${serviceCall.customer.id}`}>
                    {serviceCall.customer.name}
                  </Link>
                ) : (
                  emptyValue
                )}
              </dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "equipment")}</dt>
              <dd>
                {serviceCall.equipment ? (
                  <Link to={`/equipment/${serviceCall.equipment.id}`}>
                    {serviceCall.equipment.name}
                  </Link>
                ) : (
                  emptyValue
                )}
              </dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "branch")}</dt>
              <dd>{serviceCall.branch?.name ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "assignee")}</dt>
              <dd>{serviceCall.assignedUser?.displayName ?? t("serviceCalls", "unassigned")}</dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card">
          <h3>{t("serviceCalls", "contactSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("serviceCalls", "contactName")}</dt>
              <dd>{serviceCall.contactName ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "contactPhone")}</dt>
              <dd dir="ltr">
                {serviceCall.contactPhone
                  ? formatPhone(serviceCall.contactPhone, locale)
                  : emptyValue}
              </dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card customer-detail-card--wide">
          <h3>{t("serviceCalls", "notesSection")}</h3>
          <p className="customer-detail-notes">
            {serviceCall.notes ?? t("serviceCalls", "noNotes")}
          </p>
        </section>
      </div>
    </div>
  );
}
