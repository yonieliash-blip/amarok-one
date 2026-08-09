import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { OrganizationMember, ServiceCall, ServiceCallLifecycleView } from "@amarok-one/types";
import {
  PERMISSIONS,
  canWriteServiceCalls,
  extractPermissionSlugs,
  isAssignedServiceCallsOnly,
} from "@amarok-one/permissions";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { ServiceCallLifecyclePanel } from "../../components/ServiceCallLifecyclePanel";
import { ServiceCallTechnicianWorkflowPanel } from "../../components/ServiceCallTechnicianWorkflowPanel";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { ServiceCallVisitTimeline } from "../../components/ServiceCallVisitTimeline";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate, formatPhone } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  deleteServiceCallRequest,
  getServiceCallLifecycleRequest,
  getServiceCallRequest,
  hasServiceCallsAssign,
  hasServiceCallsClose,
  listAssignableUsersRequest,
} from "../../lib/service-calls-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "error" | "deleting";

export function ServiceCallDetailPage() {
  const { serviceCallId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [serviceCall, setServiceCall] = useState<ServiceCall | null>(null);
  const [assignees, setAssignees] = useState<OrganizationMember[]>([]);
  const [lifecycle, setLifecycle] = useState<ServiceCallLifecycleView | null>(null);
  const [lifecycleStatus, setLifecycleStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [lifecycleErrorMessage, setLifecycleErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const permissionSlugs = user ? extractPermissionSlugs(user.permissions) : [];
  const canWrite = canWriteServiceCalls(permissionSlugs);
  const canAssign = hasServiceCallsAssign(user?.permissions ?? []);
  const canClose = hasServiceCallsClose(user?.permissions ?? []);
  const technicianOnly = isAssignedServiceCallsOnly(permissionSlugs);
  const canUpdateAssignedVisit =
    technicianOnly && permissionSlugs.includes(PERMISSIONS.MY_SERVICE_CALLS_WRITE);
  const listBackPath = technicianOnly ? "/my/service-calls" : "/service-calls";
  const emptyValue = t("common", "emptyValue");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken || !serviceCallId) return;

      setStatus("loading");
      setLifecycleStatus("loading");
      setErrorMessage(null);
      setLifecycleErrorMessage(null);

      try {
        const [detail, assigneeList, lifecycleResult] = await Promise.all([
          getServiceCallRequest(user.organization.id, serviceCallId, accessToken),
          canAssign
            ? listAssignableUsersRequest(user.organization.id, accessToken)
            : Promise.resolve([] as OrganizationMember[]),
          getServiceCallLifecycleRequest(user.organization.id, serviceCallId, accessToken).then(
            (view) => ({ ok: true as const, view }),
            (error: unknown) => ({ ok: false as const, error }),
          ),
        ]);
        if (!cancelled) {
          setServiceCall(detail);
          setAssignees(assigneeList);
          if (lifecycleResult.ok) {
            setLifecycle(lifecycleResult.view);
            setLifecycleStatus("ready");
          } else {
            setLifecycle(null);
            setLifecycleStatus("error");
            setLifecycleErrorMessage(
              isApiRequestError(lifecycleResult.error)
                ? getApiErrorMessage(
                    lifecycleResult.error,
                    t("serviceCalls", "loadVisitsErrorMessage"),
                  )
                : t("serviceCalls", "loadVisitsErrorMessage"),
            );
          }
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
  }, [user, accessToken, serviceCallId, t, canAssign, reloadToken]);

  async function reloadDetail(): Promise<void> {
    setReloadToken((value) => value + 1);
  }

  async function handleDelete(): Promise<void> {
    if (!user || !accessToken || !serviceCallId || !serviceCall || !canWrite) return;

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
        onRetry={() => void reloadDetail()}
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

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("serviceCalls", "callEyebrow")}</p>
          <h2 className="customers-page__title">{serviceCall.title}</h2>
          <div className="customers-page__meta">
            <ServiceCallLifecycleBadge lifecycleState={serviceCall.lifecycleState} />
            <ServiceCallPriorityBadge priority={serviceCall.priority} />
            <span dir="ltr">{serviceCall.serviceCallNumber}</span>
          </div>
        </div>
        <div className="customers-page__actions">
          <Link to={listBackPath}>
            <Button variant="secondary">{t("serviceCalls", "backToList")}</Button>
          </Link>
          {canWrite ? (
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

      {canAssign || canClose ? (
        <ServiceCallLifecyclePanel
          organizationId={user.organization.id}
          serviceCallId={serviceCall.id}
          accessToken={accessToken}
          serviceCall={serviceCall}
          availableTransitions={lifecycle?.availableTransitions ?? []}
          assignees={assignees}
          canAssign={canAssign}
          canClose={canClose}
          onUpdated={reloadDetail}
        />
      ) : null}

      {canUpdateAssignedVisit && lifecycleStatus === "ready" && lifecycle ? (
        <ServiceCallTechnicianWorkflowPanel
          organizationId={user.organization.id}
          serviceCallId={serviceCall.id}
          technicianId={user.id}
          accessToken={accessToken}
          lifecycle={lifecycle}
          onUpdated={reloadDetail}
        />
      ) : null}

      <ServiceCallVisitTimeline
        serviceCall={serviceCall}
        assignees={assignees}
        lifecycle={lifecycle}
        status={lifecycleStatus}
        errorMessage={lifecycleErrorMessage}
        onRetry={() => void reloadDetail()}
      />

      <div className="customer-detail-grid">
        <section className="customer-detail-card">
          <h3>{t("serviceCalls", "detailsSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("serviceCalls", "description")}</dt>
              <dd>{serviceCall.description ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "workSite")}</dt>
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
              <dd>{serviceCall.customer?.name ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("serviceCalls", "machine")}</dt>
              <dd>
                {serviceCall.equipment
                  ? `${serviceCall.equipment.name} (${serviceCall.equipment.internalNumber})`
                  : emptyValue}
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
