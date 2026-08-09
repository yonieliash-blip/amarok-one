import { useState } from "react";
import type { ServiceCallLifecycleView } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import { getApiErrorMessage } from "../lib/auth-errors";
import { isApiRequestError } from "../lib/api-client";
import {
  finishServiceCallVisitRequest,
  startServiceCallVisitDrivingRequest,
  startServiceCallVisitWorkingRequest,
} from "../lib/service-calls-api";
import {
  getTechnicianVisitWorkflowAction,
  selectTechnicianActiveVisit,
} from "../lib/service-call-technician-workflow";
import { getServiceCallVisitStatusLabel } from "../lib/service-call-timeline-labels";

interface ServiceCallTechnicianWorkflowPanelProps {
  organizationId: string;
  serviceCallId: string;
  technicianId: string;
  accessToken: string;
  lifecycle: ServiceCallLifecycleView;
  onUpdated: () => Promise<void>;
}

export function ServiceCallTechnicianWorkflowPanel({
  organizationId,
  serviceCallId,
  technicianId,
  accessToken,
  lifecycle,
  onUpdated,
}: ServiceCallTechnicianWorkflowPanelProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const visit = selectTechnicianActiveVisit(lifecycle.visits, technicianId);
  const action = getTechnicianVisitWorkflowAction(visit);

  async function runAction(): Promise<void> {
    if (!visit || !action) return;

    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (action === "start_driving") {
        await startServiceCallVisitDrivingRequest(
          organizationId,
          serviceCallId,
          visit.id,
          accessToken,
        );
      } else if (action === "start_working") {
        await startServiceCallVisitWorkingRequest(
          organizationId,
          serviceCallId,
          visit.id,
          accessToken,
        );
      } else {
        await finishServiceCallVisitRequest(organizationId, serviceCallId, visit.id, accessToken, {
          nextLifecycleState: "waiting_manager_closure",
        });
      }
      setSuccessMessage(t("serviceCalls", "technicianWorkflowActionSuccess"));
      await onUpdated();
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("serviceCalls", "technicianWorkflowActionError"))
          : t("serviceCalls", "technicianWorkflowActionError"),
      );
    } finally {
      setBusy(false);
    }
  }

  const actionLabel =
    action === "start_driving"
      ? t("serviceCalls", "technicianStartDriving")
      : action === "start_working"
        ? t("serviceCalls", "technicianStartWorking")
        : action === "complete_for_manager_closure"
          ? t("serviceCalls", "technicianCompleteForManager")
          : null;

  return (
    <section className="customer-detail-card customer-detail-card--wide service-call-lifecycle-panel">
      <div className="service-call-lifecycle-panel__header">
        <h3>{t("serviceCalls", "technicianWorkflowSection")}</h3>
      </div>

      {errorMessage ? (
        <div className="customers-alert customers-alert--error" role="alert">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="customers-alert customers-alert--success" role="status">
          {successMessage}
        </div>
      ) : null}

      {visit ? (
        <div className="service-call-lifecycle-panel__actions">
          <div className="service-call-lifecycle-panel__group">
            <p>
              {t("serviceCalls", "technicianActiveVisit", { sequence: visit.sequence })}:{" "}
              {getServiceCallVisitStatusLabel(t, visit.status)}
            </p>
            {actionLabel ? (
              <Button type="button" variant="primary" disabled={busy} onClick={runAction}>
                {actionLabel}
              </Button>
            ) : (
              <p className="service-call-lifecycle-panel__hint">
                {t("serviceCalls", "technicianNoAvailableAction")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="service-call-lifecycle-panel__hint">
          {t("serviceCalls", "technicianNoActiveVisit")}
        </p>
      )}

      <p className="service-call-lifecycle-panel__hint">
        {t("serviceCalls", "technicianWorkflowHint")}
      </p>
    </section>
  );
}
