import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CustomerStatus } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { getCustomerStatusLabel } from "../../lib/customer-status";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  createCustomerRequest,
  getCustomerRequest,
  updateCustomerRequest,
  type CustomerFormInput,
} from "../../lib/customers-api";
import { isApiRequestError } from "../../lib/api-client";

type FormStatus = "loading" | "ready" | "submitting" | "error";

const EMPTY_FORM: CustomerFormInput = {
  name: "",
  customerNumber: "",
  legalName: "",
  registrationNumber: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  notes: "",
  status: "active",
};

export function CustomerFormPage() {
  const { customerId } = useParams();
  const isEdit = Boolean(customerId);
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<FormStatus>(isEdit ? "loading" : "ready");
  const [form, setForm] = useState<CustomerFormInput>(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusOptions: CustomerStatus[] = ["active", "inactive", "prospect"];

  useEffect(() => {
    if (!isEdit || !customerId || !user || !accessToken) {
      return;
    }

    let cancelled = false;

    const organizationId = user.organization.id;
    const activeCustomerId = customerId;
    const token = accessToken;

    async function loadCustomer(): Promise<void> {
      setStatus("loading");
      try {
        const customer = await getCustomerRequest(organizationId, activeCustomerId, token);
        if (cancelled) {
          return;
        }
        setForm({
          name: customer.name,
          customerNumber: customer.customerNumber,
          legalName: customer.legalName ?? "",
          registrationNumber: customer.registrationNumber ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          address: customer.address ?? "",
          city: customer.city ?? "",
          country: customer.country ?? "",
          notes: customer.notes ?? "",
          status: customer.status,
        });
        setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            isApiRequestError(error)
              ? getApiErrorMessage(error, t("customers", "loadCustomerError"))
              : t("customers", "loadCustomerError"),
          );
          setStatus("error");
        }
      }
    }

    void loadCustomer();

    return () => {
      cancelled = true;
    };
  }, [isEdit, customerId, user, accessToken, t]);

  function updateField<K extends keyof CustomerFormInput>(
    key: K,
    value: CustomerFormInput[K],
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

    const payload: CustomerFormInput = {
      name: form.name.trim(),
      customerNumber: form.customerNumber.trim(),
      status: form.status,
      legalName: form.legalName?.trim() || undefined,
      registrationNumber: form.registrationNumber?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      address: form.address?.trim() || undefined,
      city: form.city?.trim() || undefined,
      country: form.country?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    try {
      if (isEdit && customerId) {
        await updateCustomerRequest(user.organization.id, customerId, accessToken, payload);
        setSuccessMessage(t("customers", "saveSuccess"));
        setStatus("ready");
        navigate(`/customers/${customerId}`);
      } else {
        const created = await createCustomerRequest(user.organization.id, accessToken, payload);
        navigate(`/customers/${created.id}`);
      }
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "saveError"))
          : t("customers", "saveError"),
      );
      setStatus("ready");
    }
  }

  if (!user || !accessToken) {
    return <LoadingState message={t("customers", "loadForm")} />;
  }

  if (status === "loading") {
    return <LoadingState message={t("customers", "loading")} />;
  }

  if (status === "error" && isEdit) {
    return (
      <ErrorState
        title={t("customers", "loadErrorTitle")}
        message={errorMessage ?? t("customers", "loadCustomerError")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">
            {isEdit ? t("customers", "editEyebrow") : t("customers", "createEyebrow")}
          </p>
          <h2 className="customers-page__title">
            {isEdit ? t("customers", "editTitle") : t("customers", "newTitle")}
          </h2>
        </div>
        <Link to={isEdit && customerId ? `/customers/${customerId}` : "/customers"}>
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
          <h3>{t("customers", "identitySection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>
                {t("customers", "name")} {t("common", "requiredMark")}
              </span>
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                onInvalid={(event) => {
                  event.currentTarget.setCustomValidity(t("validation", "customerNameRequired"));
                }}
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("customers", "legalName")}</span>
              <input
                value={form.legalName ?? ""}
                onChange={(event) => updateField("legalName", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>
                {t("customers", "customerNumber")} {t("common", "requiredMark")}
              </span>
              <input
                required
                dir="ltr"
                value={form.customerNumber}
                onChange={(event) =>
                  updateField("customerNumber", event.target.value.toUpperCase())
                }
                pattern="[A-Z0-9_-]+"
                title={t("customers", "customerNumberPatternTitle")}
                onInvalid={(event) => {
                  event.currentTarget.setCustomValidity(
                    t("customers", "customerNumberPatternTitle"),
                  );
                }}
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("customers", "registrationNumber")}</span>
              <input
                dir="ltr"
                value={form.registrationNumber ?? ""}
                onChange={(event) => updateField("registrationNumber", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("customers", "status")}</span>
              <select
                value={form.status ?? "active"}
                onChange={(event) => updateField("status", event.target.value as CustomerStatus)}
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {getCustomerStatusLabel(t, value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("customers", "contactLocationSection")}</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>{t("customers", "email")}</span>
              <input
                type="email"
                dir="ltr"
                value={form.email ?? ""}
                onChange={(event) => updateField("email", event.target.value)}
                onInvalid={(event) => {
                  event.currentTarget.setCustomValidity(t("validation", "emailInvalid"));
                }}
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("customers", "phone")}</span>
              <input
                dir="ltr"
                value={form.phone ?? ""}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>{t("customers", "address")}</span>
              <input
                value={form.address ?? ""}
                onChange={(event) => updateField("address", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("customers", "city")}</span>
              <input
                value={form.city ?? ""}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("customers", "country")}</span>
              <input
                value={form.country ?? ""}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="customer-form__section">
          <h3>{t("customers", "notesSection")}</h3>
          <label className="customer-form__field customer-form__field--wide">
            <span>{t("customers", "internalNotes")}</span>
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
              ? t("customers", "saving")
              : isEdit
                ? t("customers", "saveChanges")
                : t("customers", "createCustomer")}
          </Button>
        </div>
      </form>
    </div>
  );
}
