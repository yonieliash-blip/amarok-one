import { useState } from "react";
import type { OrganizationMember, ServiceCall, ServiceCallLifecycleState } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import { getApiErrorMessage } from "../lib/auth-errors";
import { isApiRequestError } from "../lib/api-client";
import { getServiceCallLifecycleLabel } from "../lib/service-call-lifecycle-labels";
import {
  getAvailableManagerLifecycleTransitions,
  isServiceCallClosureAvailable,
} from "../lib/service-call-lifecycle-filter";
import {
  assignTechnicianRequest,
  closeServiceCallLifecycleRequest,
  transitionServiceCallLifecycleRequest,
} from "../lib/service-calls-api";
import { ServiceCallLifecycleBadge } from "./ServiceCallLifecycleBadge";

interface ServiceCallLifecyclePanelProps {
  organizationId: string;
  serviceCallId: string;
  accessToken: string;
  serviceCall: ServiceCall;
  availableTransitions: readonly ServiceCallLifecycleState[];
  assignees: OrganizationMember[];
  canAssign: boolean;
  canClose: boolean;
  onUpdated: () => Promise<void>;
}

export function ServiceCallLifecyclePanel({
  organizationId,
  serviceCallId,
  accessToken,
  serviceCall,
  availableTransitions = [],
  assignees,
  canAssign,
  canClose,
  onUpdated,
}: ServiceCallLifecyclePanelProps) {
  const { t } = useTranslation();
  const [assigneeId, setAssigneeId] = useState("");
  const [transitionState, setTransitionState] = useState<ServiceCallLifecycleState | "">("");
  const [closeReason, setCloseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isClosed = serviceCall.lifecycleState === "closed";

  async function runAction(
    action: () => Promise<void>,
    invalidTransitionMessage?: string,
  ): Promise<void> {
    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await action();
      setSuccessMessage(t("serviceCalls", "lifecycleActionSuccess"));
      await onUpdated();
    } catch (error) {
      setErrorMessage(
        invalidTransitionMessage &&
          isApiRequestError(error) &&
          error.code === "VALIDATION_ERROR" &&
          error.details?.to === "closed"
          ? invalidTransitionMessage
          : isApiRequestError(error)
            ? getApiErrorMessage(error, t("serviceCalls", "lifecycleActionError"))
            : t("serviceCalls", "lifecycleActionError"),
      );
    } finally {
      setBusy(false);
    }
  }

  const transitionOptions = getAvailableManagerLifecycleTransitions(
    availableTransitions,
    serviceCall.lifecycleState,
  );
  const closureAvailable = isServiceCallClosureAvailable(availableTransitions);
  const closeUnavailableMessage = t("serviceCalls", "closeUnavailableForCurrentState", {
    state: getServiceCallLifecycleLabel(t, serviceCall.lifecycleState),
  });

  return (
    <section className="customer-detail-card customer-detail-card--wide service-call-lifecycle-panel">
      <div className="service-call-lifecycle-panel__header">
        <h3>{t("serviceCalls", "lifecycleSection")}</h3>
        <ServiceCallLifecycleBadge lifecycleState={serviceCall.lifecycleState} />
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

      {isClosed ? (
        <p className="service-call-lifecycle-panel__hint">
          {t("serviceCalls", "lifecycleClosedHint")}
        </p>
      ) : (
        <div className="service-call-lifecycle-panel__actions">
          {canAssign ? (
            <div className="service-call-lifecycle-panel__group">
              <label className="customers-toolbar__filter">
                <span>{t("serviceCalls", "assignTechnician")}</span>
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  disabled={busy}
                >
                  <option value="">{t("serviceCalls", "selectTechnician")}</option>
                  {assignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !assigneeId}
                onClick={() =>
                  void runAction(async () => {
                    await assignTechnicianRequest(organizationId, serviceCallId, accessToken, {
                      technicianId: assigneeId,
                    });
                    setAssigneeId("");
                  })
                }
              >
                {t("serviceCalls", "assignTechnician")}
              </Button>
            </div>
          ) : null}

          {canAssign ? (
            <div className="service-call-lifecycle-panel__group">
              <label className="customers-toolbar__filter">
                <span>{t("serviceCalls", "transitionLifecycle")}</span>
                <select
                  value={transitionState}
                  onChange={(event) =>
                    setTransitionState(event.target.value as ServiceCallLifecycleState | "")
                  }
                  disabled={busy || transitionOptions.length === 0}
                >
                  <option value="">{t("serviceCalls", "selectLifecycleState")}</option>
                  {transitionOptions.map((state) => (
                    <option key={state} value={state}>
                      {getServiceCallLifecycleLabel(t, state)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !transitionState}
                onClick={() =>
                  void runAction(async () => {
                    if (!transitionState) return;
                    await transitionServiceCallLifecycleRequest(
                      organizationId,
                      serviceCallId,
                      accessToken,
                      { toLifecycleState: transitionState },
                    );
                    setTransitionState("");
                  })
                }
              >
                {t("serviceCalls", "applyLifecycleTransition")}
              </Button>
            </div>
          ) : null}

          {canClose ? (
            <div className="service-call-lifecycle-panel__group service-call-lifecycle-panel__group--close">
              <label className="customers-toolbar__filter customer-form__field--wide">
                <span>{t("serviceCalls", "closeReason")}</span>
                <input
                  type="text"
                  value={closeReason}
                  onChange={(event) => setCloseReason(event.target.value)}
                  placeholder={t("serviceCalls", "closeReasonPlaceholder")}
                  disabled={busy || !closureAvailable}
                  maxLength={500}
                  aria-describedby={
                    !closureAvailable ? "service-call-close-unavailable" : undefined
                  }
                />
              </label>
              <Button
                type="button"
                variant="primary"
                disabled={busy || !closureAvailable}
                onClick={() =>
                  void runAction(async () => {
                    await closeServiceCallLifecycleRequest(
                      organizationId,
                      serviceCallId,
                      accessToken,
                      {
                        reason: closeReason.trim() || undefined,
                      },
                    );
                    setCloseReason("");
                  }, closeUnavailableMessage)
                }
              >
                {t("serviceCalls", "closeServiceCall")}
              </Button>
              {!closureAvailable ? (
                <p
                  className="service-call-lifecycle-panel__hint"
                  id="service-call-close-unavailable"
                >
                  {closeUnavailableMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
