import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  Branch,
  Customer,
  Equipment,
  OrganizationMember,
  ServiceCallPriority,
  ServiceCallStatus,
} from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listCustomersRequest } from "../../lib/customers-api";
import {
  listBranchesRequest,
  listCompaniesRequest,
  listEquipmentRequest,
} from "../../lib/equipment-api";
import {
  getServiceCallPriorityLabel,
  getServiceCallStatusLabel,
} from "../../lib/service-call-labels";
import {
  createServiceCallRequest,
  getServiceCallRequest,
  listAssignableUsersRequest,
  updateServiceCallRequest,
  type ServiceCallFormInput,
} from "../../lib/service-calls-api";
import { isApiRequestError } from "../../lib/api-client";

type FormStatus = "loading" | "ready" | "submitting" | "error";

const EMPTY_FORM: ServiceCallFormInput = {
  serviceCallNumber: "",
  title: "",
  description: "",
  status: "open",
  priority: "normal",
  customerId: "",
  equipmentId: "",
  branchId: "",
  assignedUserId: "",
  contactName: "",
  contactPhone: "",
  location: "",
  notes: "",
};

function toLocalDateTimeInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return new Date(value).toISOString();
}

export function ServiceCallFormPage() {
  const { serviceCallId } = useParams();
  const isEdit = Boolean(serviceCallId);
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<FormStatus>(isEdit ? "loading" : "ready");
  const [form, setForm] = useState<ServiceCallFormInput>(EMPTY_FORM);
  const [openedAtInput, setOpenedAtInput] = useState("");
  const [scheduledAtInput, setScheduledAtInput] = useState("");
  const [completedAtInput, setCompletedAtInput] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assignees, setAssignees] = useState<OrganizationMember[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusOptions: ServiceCallStatus[] = [
    "open",
    "scheduled",
    "in_progress",
    "waiting_for_parts",
    "completed",
    "cancelled",
  ];
  const priorityOptions: ServiceCallPriority[] = ["low", "normal", "high", "urgent"];

  const compatibleEquipment = useMemo(() => {
    if (!form.customerId) return equipment;
    return equipment.filter((item) => !item.customerId || item.customerId === form.customerId);
  }, [equipment, form.customerId]);

  useEffect(() => {
    if (!user || !accessToken) return;

    let cancelled = false;

    async function loadOptions(): Promise<void> {
      try {
        const [customerResult, equipmentResult, assigneeList, companies] = await Promise.all([
          listCustomersRequest(user!.organization.id, accessToken!, { pageSize: 100 }),
          listEquipmentRequest(user!.organization.id, accessToken!, { pageSize: 100 }),
          listAssignableUsersRequest(user!.organization.id, accessToken!),
          listCompaniesRequest(user!.organization.id, accessToken!),
        ]);
        const branchLists = await Promise.all(
          companies.map((company) =>
            listBranchesRequest(user!.organization.id, company.id, accessToken!),
          ),
        );
        if (!cancelled) {
          setCustomers(customerResult.data);
          setEquipment(equipmentResult.data);
          setAssignees(assigneeList);
          setBranches(branchLists.flat());
        }
      } catch {
        /* optional */
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken]);

  useEffect(() => {
    if (!isEdit || !serviceCallId || !user || !accessToken) return;

    let cancelled = false;
    const organizationId = user.organization.id;
    const activeId = serviceCallId;
    const token = accessToken;

    async function loadServiceCall(): Promise<void> {
      setStatus("loading");
      try {
        const call = await getServiceCallRequest(organizationId, activeId, token);
        if (cancelled) return;
        setForm({
          serviceCallNumber: call.serviceCallNumber,
          title: call.title,
          description: call.description ?? "",
          status: call.status,
          priority: call.priority,
          customerId: call.customerId,
          equipmentId: call.equipmentId,
          branchId: call.branchId ?? "",
          assignedUserId: call.assignedUserId ?? "",
          contactName: call.contactName ?? "",
          contactPhone: call.contactPhone ?? "",
          location: call.location ?? "",
          notes: call.notes ?? "",
        });
        setOpenedAtInput(toLocalDateTimeInput(call.openedAt));
        setScheduledAtInput(toLocalDateTimeInput(call.scheduledAt));
        setCompletedAtInput(toLocalDateTimeInput(call.completedAt));
        setStatus("ready");
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

    void loadServiceCall();
    return () => {
      cancelled = true;
    };
  }, [isEdit, serviceCallId, user, accessToken, t]);

  function updateField<K extends keyof ServiceCallFormInput>(
    key: K,
    value: ServiceCallFormInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken) return;

    setStatus("submitting");
    setErrorMessage(null);

    const basePayload = {
      serviceCallNumber: form.serviceCallNumber.trim(),
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      status: form.status,
      priority: form.priority,
      customerId: form.customerId,
      equipmentId: form.equipmentId,
      openedAt: toIsoDateTime(openedAtInput),
      scheduledAt: toIsoDateTime(scheduledAtInput),
      completedAt: toIsoDateTime(completedAtInput),
      branchId: form.branchId?.trim() || undefined,
      contactName: form.contactName?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      location: form.location?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    try {
      if (isEdit && serviceCallId) {
        await updateServiceCallRequest(user.organization.id, serviceCallId, accessToken, {
          ...basePayload,
          assignedUserId: form.assignedUserId?.trim() || null,
        });
        navigate(`/service-calls/${serviceCallId}`);
      } else {
        const created = await createServiceCallRequest(user.organization.id, accessToken, {
          ...basePayload,
          assignedUserId: form.assignedUserId?.trim() || undefined,
        });
        navigate(`/service-calls/${created.id}`);
      }
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("serviceCalls", "saveError"))
          : t("serviceCalls", "saveError"),
      );
      setStatus("ready");
    }
  }

  if (!user || !accessToken) {
    return <LoadingState message={t("serviceCalls", "loadForm")} />;
  }

  if (status === "loading") {
    return <LoadingState message={t("serviceCalls", "loading")} />;
  }

  if (status === "error" && isEdit) {
    return (
      <ErrorState
        title={t("serviceCalls", "loadErrorTitle")}
        message={errorMessage ?? t("serviceCalls", "loadCallError")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">
            {isEdit ? t("serviceCalls", "editEyebrow") : t("serviceCalls", "createEyebrow")}
          </p>
          <h2 className="customers-page__title">
            {isEdit ? t("serviceCalls", "editTitle") : t("serviceCalls", "newTitle")}
          </h2>
        </div>
        <Link to={isEdit && serviceCallId ? `/service-calls/${serviceCallId}` : "/service-calls"}>
          <Button variant="secondary">{t("common", "cancel")}</Button>
        </Link>
      </header>

      {errorMessage ? (
        <div className="customers-alert customers-alert--error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <form className="customer-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <section className="customer-form__section">
          <h3>{t("serviceCalls", "detailsSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>
                {t("serviceCalls", "serviceCallNumber")} {t("common", "requiredMark")}
              </span>
              <input
                required
                dir="ltr"
                value={form.serviceCallNumber}
                onChange={(event) =>
                  updateField("serviceCallNumber", event.target.value.toUpperCase())
                }
                pattern="[A-Z0-9_-]+"
                title={t("serviceCalls", "serviceCallNumberPatternTitle")}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>
                {t("serviceCalls", "titleLabel")} {t("common", "requiredMark")}
              </span>
              <input
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>{t("serviceCalls", "description")}</span>
              <textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "status")}</span>
              <select
                value={form.status ?? "open"}
                onChange={(event) => updateField("status", event.target.value as ServiceCallStatus)}
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {getServiceCallStatusLabel(t, value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "priority")}</span>
              <select
                value={form.priority ?? "normal"}
                onChange={(event) =>
                  updateField("priority", event.target.value as ServiceCallPriority)
                }
              >
                {priorityOptions.map((value) => (
                  <option key={value} value={value}>
                    {getServiceCallPriorityLabel(t, value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("serviceCalls", "assignmentSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>
                {t("serviceCalls", "customer")} {t("common", "requiredMark")}
              </span>
              <select
                required
                value={form.customerId}
                onChange={(event) => {
                  updateField("customerId", event.target.value);
                  updateField("equipmentId", "");
                }}
              >
                <option value="" disabled>
                  —
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>
                {t("serviceCalls", "equipment")} {t("common", "requiredMark")}
              </span>
              <select
                required
                value={form.equipmentId}
                onChange={(event) => updateField("equipmentId", event.target.value)}
              >
                <option value="" disabled>
                  {form.customerId ? t("serviceCalls", "selectEquipmentHint") : "—"}
                </option>
                {compatibleEquipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.internalNumber})
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "branch")}</span>
              <select
                value={form.branchId ?? ""}
                onChange={(event) => updateField("branchId", event.target.value)}
              >
                <option value="">{t("serviceCalls", "noBranch")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "assignee")}</span>
              <select
                value={form.assignedUserId ?? ""}
                onChange={(event) => updateField("assignedUserId", event.target.value)}
              >
                <option value="">{t("serviceCalls", "noAssignee")}</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("serviceCalls", "schedulingSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>{t("serviceCalls", "openedAt")}</span>
              <input
                type="datetime-local"
                dir="ltr"
                value={openedAtInput}
                onChange={(event) => setOpenedAtInput(event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "scheduledAt")}</span>
              <input
                type="datetime-local"
                dir="ltr"
                value={scheduledAtInput}
                onChange={(event) => setScheduledAtInput(event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "completedAt")}</span>
              <input
                type="datetime-local"
                dir="ltr"
                value={completedAtInput}
                onChange={(event) => setCompletedAtInput(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("serviceCalls", "contactSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>{t("serviceCalls", "contactName")}</span>
              <input
                value={form.contactName ?? ""}
                onChange={(event) => updateField("contactName", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("serviceCalls", "contactPhone")}</span>
              <input
                dir="ltr"
                value={form.contactPhone ?? ""}
                onChange={(event) => updateField("contactPhone", event.target.value)}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>{t("serviceCalls", "location")}</span>
              <input
                value={form.location ?? ""}
                onChange={(event) => updateField("location", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("serviceCalls", "notesSection")}</h3>
          <label className="customer-form__field customer-form__field--wide">
            <span>{t("serviceCalls", "internalNotes")}</span>
            <textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>
        </section>

        <div className="customer-form__actions">
          <Button variant="primary" type="submit" disabled={status === "submitting"}>
            {status === "submitting"
              ? t("serviceCalls", "saving")
              : isEdit
                ? t("serviceCalls", "saveChanges")
                : t("serviceCalls", "createServiceCall")}
          </Button>
        </div>
      </form>
    </div>
  );
}
