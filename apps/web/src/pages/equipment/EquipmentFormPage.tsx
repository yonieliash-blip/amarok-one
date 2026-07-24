import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Branch, Customer, EquipmentStatus, EquipmentType } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listCustomersRequest } from "../../lib/customers-api";
import { getEquipmentStatusLabel } from "../../lib/equipment-status";
import {
  createEquipmentRequest,
  getEquipmentRequest,
  listBranchesRequest,
  listCompaniesRequest,
  listEquipmentTypesRequest,
  updateEquipmentRequest,
  type EquipmentFormInput,
} from "../../lib/equipment-api";
import { isApiRequestError } from "../../lib/api-client";

type FormStatus = "loading" | "ready" | "submitting" | "error";

const EMPTY_FORM: EquipmentFormInput = {
  name: "",
  internalNumber: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  year: undefined,
  equipmentTypeId: "",
  customerId: "",
  branchId: "",
  status: "active",
  engineHours: undefined,
  mileage: undefined,
  registrationNumber: "",
  warrantyEndDate: "",
  location: "",
  notes: "",
};

export function EquipmentFormPage() {
  const { equipmentId } = useParams();
  const isEdit = Boolean(equipmentId);
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<FormStatus>(isEdit ? "loading" : "ready");
  const [form, setForm] = useState<EquipmentFormInput>(EMPTY_FORM);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusOptions: EquipmentStatus[] = ["active", "in_service", "out_of_service", "retired"];

  useEffect(() => {
    if (!user || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadOptions(): Promise<void> {
      try {
        const [types, customerResult, companies] = await Promise.all([
          listEquipmentTypesRequest(user!.organization.id, accessToken!),
          listCustomersRequest(user!.organization.id, accessToken!, { pageSize: 100 }),
          listCompaniesRequest(user!.organization.id, accessToken!),
        ]);

        const branchLists = await Promise.all(
          companies.map((company) =>
            listBranchesRequest(user!.organization.id, company.id, accessToken!),
          ),
        );

        if (!cancelled) {
          setEquipmentTypes(types);
          setCustomers(customerResult.data);
          setBranches(branchLists.flat());
        }
      } catch {
        /* options load failure handled on submit */
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken]);

  useEffect(() => {
    if (!isEdit || !equipmentId || !user || !accessToken) {
      return;
    }

    let cancelled = false;

    const organizationId = user.organization.id;
    const activeEquipmentId = equipmentId;
    const token = accessToken;

    async function loadEquipment(): Promise<void> {
      setStatus("loading");
      try {
        const item = await getEquipmentRequest(organizationId, activeEquipmentId, token);
        if (cancelled) {
          return;
        }
        setForm({
          name: item.name,
          internalNumber: item.internalNumber,
          serialNumber: item.serialNumber ?? "",
          manufacturer: item.manufacturer ?? "",
          model: item.model ?? "",
          year: item.year,
          equipmentTypeId: item.equipmentTypeId,
          customerId: item.customerId ?? "",
          branchId: item.branchId ?? "",
          status: item.status,
          engineHours: item.engineHours,
          mileage: item.mileage,
          registrationNumber: item.registrationNumber ?? "",
          warrantyEndDate: item.warrantyEndDate ?? "",
          location: item.location ?? "",
          notes: item.notes ?? "",
        });
        setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("equipment", "loadEquipmentError"))
              : t("equipment", "loadEquipmentError"),
          );
          setStatus("error");
        }
      }
    }

    void loadEquipment();

    return () => {
      cancelled = true;
    };
  }, [isEdit, equipmentId, user, accessToken, t]);

  function updateField<K extends keyof EquipmentFormInput>(
    key: K,
    value: EquipmentFormInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken) {
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: EquipmentFormInput = {
      name: form.name.trim(),
      internalNumber: form.internalNumber.trim(),
      equipmentTypeId: form.equipmentTypeId,
      status: form.status,
      serialNumber: form.serialNumber?.trim() || undefined,
      manufacturer: form.manufacturer?.trim() || undefined,
      model: form.model?.trim() || undefined,
      year: form.year ? Number(form.year) : undefined,
      customerId: form.customerId?.trim() || undefined,
      branchId: form.branchId?.trim() || undefined,
      engineHours: form.engineHours !== undefined ? Number(form.engineHours) : undefined,
      mileage: form.mileage !== undefined ? Number(form.mileage) : undefined,
      registrationNumber: form.registrationNumber?.trim() || undefined,
      warrantyEndDate: form.warrantyEndDate?.trim() || undefined,
      location: form.location?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    try {
      if (isEdit && equipmentId) {
        await updateEquipmentRequest(user.organization.id, equipmentId, accessToken, payload);
        setSuccessMessage(t("equipment", "saveSuccess"));
        setStatus("ready");
        navigate(`/equipment/${equipmentId}`);
      } else {
        const created = await createEquipmentRequest(user.organization.id, accessToken, payload);
        navigate(`/equipment/${created.id}`);
      }
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipment", "saveError"))
          : t("equipment", "saveError"),
      );
      setStatus("ready");
    }
  }

  if (!user || !accessToken) {
    return <LoadingState message={t("equipment", "loadForm")} />;
  }

  if (status === "loading") {
    return <LoadingState message={t("equipment", "loading")} />;
  }

  if (status === "error" && isEdit) {
    return (
      <ErrorState
        title={t("equipment", "loadErrorTitle")}
        message={errorMessage ?? t("equipment", "loadEquipmentError")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">
            {isEdit ? t("equipment", "editEyebrow") : t("equipment", "createEyebrow")}
          </p>
          <h2 className="customers-page__title">
            {isEdit ? t("equipment", "editTitle") : t("equipment", "newTitle")}
          </h2>
        </div>
        <Link to={isEdit && equipmentId ? `/equipment/${equipmentId}` : "/equipment"}>
          <Button variant="secondary">{t("common", "cancel")}</Button>
        </Link>
      </header>

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

      <form className="customer-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <section className="customer-form__section">
          <h3>{t("equipment", "identitySection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>
                {t("equipment", "name")} {t("common", "requiredMark")}
              </span>
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>
                {t("equipment", "internalNumber")} {t("common", "requiredMark")}
              </span>
              <input
                required
                dir="ltr"
                value={form.internalNumber}
                onChange={(event) =>
                  updateField("internalNumber", event.target.value.toUpperCase())
                }
                pattern="[A-Z0-9_-]+"
                title={t("equipment", "internalNumberPatternTitle")}
              />
            </label>
            <label className="customer-form__field">
              <span>
                {t("equipment", "equipmentType")} {t("common", "requiredMark")}
              </span>
              <select
                required
                value={form.equipmentTypeId}
                onChange={(event) => updateField("equipmentTypeId", event.target.value)}
              >
                <option value="" disabled>
                  —
                </option>
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "status")}</span>
              <select
                value={form.status ?? "active"}
                onChange={(event) => updateField("status", event.target.value as EquipmentStatus)}
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {getEquipmentStatusLabel(t, value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "serialNumber")}</span>
              <input
                dir="ltr"
                value={form.serialNumber ?? ""}
                onChange={(event) => updateField("serialNumber", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "registrationNumber")}</span>
              <input
                dir="ltr"
                value={form.registrationNumber ?? ""}
                onChange={(event) => updateField("registrationNumber", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("equipment", "specsSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>{t("equipment", "manufacturer")}</span>
              <input
                value={form.manufacturer ?? ""}
                onChange={(event) => updateField("manufacturer", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "model")}</span>
              <input
                value={form.model ?? ""}
                onChange={(event) => updateField("model", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "year")}</span>
              <input
                type="number"
                min={1900}
                max={2100}
                dir="ltr"
                value={form.year ?? ""}
                onChange={(event) =>
                  updateField("year", event.target.value ? Number(event.target.value) : undefined)
                }
              />
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "warrantyEndDate")}</span>
              <input
                type="date"
                dir="ltr"
                value={form.warrantyEndDate ?? ""}
                onChange={(event) => updateField("warrantyEndDate", event.target.value)}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>{t("equipment", "location")}</span>
              <input
                value={form.location ?? ""}
                onChange={(event) => updateField("location", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("equipment", "assignmentSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>{t("equipment", "customer")}</span>
              <select
                value={form.customerId ?? ""}
                onChange={(event) => updateField("customerId", event.target.value)}
              >
                <option value="">{t("equipment", "noCustomer")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "branch")}</span>
              <select
                value={form.branchId ?? ""}
                onChange={(event) => updateField("branchId", event.target.value)}
              >
                <option value="">{t("equipment", "noBranch")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("equipment", "metricsSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>{t("equipment", "engineHours")}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                dir="ltr"
                value={form.engineHours ?? ""}
                onChange={(event) =>
                  updateField(
                    "engineHours",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "mileage")}</span>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={form.mileage ?? ""}
                onChange={(event) =>
                  updateField(
                    "mileage",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("equipment", "notesSection")}</h3>
          <label className="customer-form__field customer-form__field--wide">
            <span>{t("equipment", "internalNotes")}</span>
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
              ? t("equipment", "saving")
              : isEdit
                ? t("equipment", "saveChanges")
                : t("equipment", "createEquipment")}
          </Button>
        </div>
      </form>
    </div>
  );
}
