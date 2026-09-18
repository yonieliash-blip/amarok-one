import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PERMISSIONS } from "@amarok-one/permissions";
import { Badge, Button } from "@amarok-one/ui";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAuth } from "../../auth/useAuth";
import { getApiErrorMessage, getAuthErrorMessage } from "../../lib/auth-errors";
import { isApiRequestError } from "../../lib/api-client";
import {
  createTechnicianRequest,
  listTechniciansRequest,
  type CreateTechnicianInput,
  type TechnicianSummary,
} from "../../lib/technicians-api";
import { useTranslation } from "../../i18n/useTranslation";

type CreateStatus = "idle" | "submitting";

const EMPTY_FORM: CreateTechnicianInput = {
  displayName: "",
  email: "",
  password: "",
};

export function TechniciansListPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStatus, setCreateStatus] = useState<CreateStatus>("idle");
  const [createForm, setCreateForm] = useState<CreateTechnicianInput>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const canViewCurrentLocations =
    user?.permissions.some((permission) => permission.slug === PERMISSIONS.ATTENDANCE_READ) ?? false;
  const canCreateTechnician =
    Boolean(user?.isOrganizationOwner) &&
    (user?.permissions.some((permission) => permission.slug === PERMISSIONS.TECHNICIANS_WRITE) ??
      false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const rows = await listTechniciansRequest(user.organization.id, accessToken);
        if (!cancelled) setTechnicians(rows);
      } catch (cause) {
        if (!cancelled) setError(getAuthErrorMessage(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, retryKey, user]);

  function updateCreateField<K extends keyof CreateTechnicianInput>(
    key: K,
    value: CreateTechnicianInput[K],
  ): void {
    setCreateForm((current) => ({ ...current, [key]: value }));
    setCreateError(null);
    setCreateSuccess(null);
  }

  async function handleCreateTechnician(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken || !canCreateTechnician) {
      return;
    }

    setCreateStatus("submitting");
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const created = await createTechnicianRequest(user.organization.id, accessToken, {
        displayName: createForm.displayName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
      });

      setTechnicians((current) =>
        [...current, created].sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        ),
      );
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      setCreateSuccess(t("technicians", "created"));
    } catch (cause) {
      setCreateError(
        isApiRequestError(cause)
          ? getApiErrorMessage(cause, t("technicians", "createError"))
          : t("technicians", "createError"),
      );
    } finally {
      setCreateStatus("idle");
    }
  }

  if (loading) return <LoadingState message={t("technicians", "loading")} />;
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />;

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("technicians", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("technicians", "title")}</h2>
          <p className="customers-page__subtitle">
            {t("technicians", "subtitle", { organization: user?.organization.name ?? "" })}
          </p>
        </div>
        <div className="customers-page__actions">
          {canViewCurrentLocations ? (
            <Link to="/technicians/current-locations">
              <Button variant="secondary">{t("currentLocations", "title")}</Button>
            </Link>
          ) : null}
          {canCreateTechnician ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setShowCreateForm((visible) => !visible);
                setCreateError(null);
                setCreateSuccess(null);
              }}
            >
              {t("technicians", "add")}
            </Button>
          ) : null}
        </div>
      </header>

      {createSuccess ? (
        <div className="customers-alert customers-alert--success" role="status">
          {createSuccess}
        </div>
      ) : null}

      {showCreateForm ? (
        <form
          className="customer-form"
          onSubmit={(event) => void handleCreateTechnician(event)}
          noValidate
        >
          <section className="customer-form__section">
            <p className="customers-page__eyebrow">{t("technicians", "createEyebrow")}</p>
            <h3>{t("technicians", "createTitle")}</h3>
            <p className="customers-page__subtitle">{t("technicians", "createSubtitle")}</p>

            {createError ? (
              <div className="customers-alert customers-alert--error" role="alert">
                {createError}
              </div>
            ) : null}

            <div className="customer-form__grid">
              <label className="customer-form__field">
                <span>
                  {t("technicians", "displayName")} {t("common", "requiredMark")}
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={createForm.displayName}
                  placeholder={t("technicians", "namePlaceholder")}
                  onChange={(event) => updateCreateField("displayName", event.target.value)}
                />
              </label>

              <label className="customer-form__field">
                <span>
                  {t("technicians", "email")} {t("common", "requiredMark")}
                </span>
                <input
                  required
                  type="email"
                  dir="ltr"
                  maxLength={256}
                  autoComplete="email"
                  value={createForm.email}
                  placeholder={t("technicians", "emailPlaceholder")}
                  onChange={(event) => updateCreateField("email", event.target.value)}
                />
              </label>

              <label className="customer-form__field customer-form__field--wide">
                <span>
                  {t("technicians", "password")} {t("common", "requiredMark")}
                </span>
                <input
                  required
                  type="password"
                  dir="ltr"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={createForm.password}
                  placeholder={t("technicians", "passwordPlaceholder")}
                  onChange={(event) => updateCreateField("password", event.target.value)}
                />
                <small className="customers-page__subtitle">
                  {t("technicians", "passwordHint")}
                </small>
              </label>
            </div>
          </section>

          <div className="customer-form__actions">
            <Button
              type="button"
              variant="secondary"
              disabled={createStatus === "submitting"}
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm(EMPTY_FORM);
                setCreateError(null);
              }}
            >
              {t("common", "cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={createStatus === "submitting"}>
              {createStatus === "submitting"
                ? t("technicians", "creating")
                : t("technicians", "create")}
            </Button>
          </div>
        </form>
      ) : null}

      {technicians.length === 0 ? (
        <EmptyState
          title={t("technicians", "emptyTitle")}
          message={t("technicians", "emptyMessage")}
        />
      ) : (
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>{t("technicians", "name")}</th>
                <th>{t("technicians", "email")}</th>
                <th>{t("technicians", "status")}</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((technician) => (
                <tr key={technician.id}>
                  <td>
                    <strong>{technician.displayName}</strong>
                  </td>
                  <td>{technician.email}</td>
                  <td>
                    <Badge variant={technician.isActive ? "success" : "default"}>
                      {technician.isActive
                        ? t("technicians", "active")
                        : t("technicians", "inactive")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
