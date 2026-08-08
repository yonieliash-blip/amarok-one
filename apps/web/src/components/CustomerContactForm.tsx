import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";
import type { CustomerContactFormInput } from "../lib/customers-api";

const EMPTY_CONTACT: CustomerContactFormInput = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  isPrimary: false,
  notes: "",
};

interface CustomerContactFormProps {
  initialValues?: CustomerContactFormInput;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (input: CustomerContactFormInput) => Promise<void>;
  onCancel: () => void;
}

export function CustomerContactForm({
  initialValues,
  submitLabel,
  submitting = false,
  onSubmit,
  onCancel,
}: CustomerContactFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CustomerContactFormInput>(initialValues ?? EMPTY_CONTACT);

  function updateField<K extends keyof CustomerContactFormInput>(
    key: K,
    value: CustomerContactFormInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const payload: CustomerContactFormInput = {
      name: form.name.trim(),
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      jobTitle: form.jobTitle?.trim() || undefined,
      isPrimary: form.isPrimary ?? false,
      notes: form.notes?.trim() || undefined,
    };
    await onSubmit(payload);
  }

  return (
    <form className="customer-contact-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="customer-form__grid">
        <label className="customer-form__field">
          <span>
            {t("customers", "contactName")} {t("common", "requiredMark")}
          </span>
          <input
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>
        <label className="customer-form__field">
          <span>{t("customers", "contactJobTitle")}</span>
          <input
            value={form.jobTitle ?? ""}
            onChange={(event) => updateField("jobTitle", event.target.value)}
          />
        </label>
        <label className="customer-form__field">
          <span>{t("customers", "email")}</span>
          <input
            type="email"
            dir="ltr"
            value={form.email ?? ""}
            onChange={(event) => updateField("email", event.target.value)}
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
        <label className="customer-form__field customer-form__field--checkbox">
          <input
            type="checkbox"
            checked={form.isPrimary ?? false}
            onChange={(event) => updateField("isPrimary", event.target.checked)}
          />
          <span>{t("customers", "setPrimaryContact")}</span>
        </label>
        <label className="customer-form__field customer-form__field--wide">
          <span>{t("customers", "internalNotes")}</span>
          <textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </label>
      </div>
      <div className="customer-form__actions">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
          {t("common", "cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? t("customers", "saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
