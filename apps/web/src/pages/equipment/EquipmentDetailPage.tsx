import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { EquipmentDetail } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { EquipmentStatusBadge } from "../../components/EquipmentStatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate, formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  deleteEquipmentRequest,
  getEquipmentRequest,
  hasEquipmentWrite,
} from "../../lib/equipment-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "error" | "deleting";

export function EquipmentDetailPage() {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canWrite = user ? hasEquipmentWrite(user.permissions) : false;
  const emptyValue = t("common", "emptyValue");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken || !equipmentId) {
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const detail = await getEquipmentRequest(user.organization.id, equipmentId, accessToken);
        if (!cancelled) {
          setEquipment(detail);
          setStatus("ready");
        }
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, equipmentId, t]);

  const reloadEquipment = useCallback(async () => {
    if (!user || !accessToken || !equipmentId) {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const detail = await getEquipmentRequest(user.organization.id, equipmentId, accessToken);
      setEquipment(detail);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipment", "loadEquipmentError"))
          : t("equipment", "loadEquipmentError"),
      );
      setStatus("error");
    }
  }, [user, accessToken, equipmentId, t]);

  async function handleDelete(): Promise<void> {
    if (!user || !accessToken || !equipmentId || !equipment) {
      return;
    }

    const confirmed = window.confirm(t("equipment", "deleteConfirm", { name: equipment.name }));
    if (!confirmed) {
      return;
    }

    setStatus("deleting");
    try {
      await deleteEquipmentRequest(user.organization.id, equipmentId, accessToken);
      navigate("/equipment");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipment", "deleteEquipmentError"))
          : t("equipment", "deleteEquipmentError"),
      );
      setStatus("ready");
    }
  }

  if (!user || !accessToken) {
    return <LoadingState message={t("equipment", "loading")} />;
  }

  if (status === "loading" || status === "deleting") {
    return (
      <LoadingState
        message={status === "deleting" ? t("equipment", "deleting") : t("equipment", "loading")}
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        title={t("equipment", "loadErrorTitle")}
        message={errorMessage ?? t("equipment", "loadEquipmentError")}
        onRetry={() => void reloadEquipment()}
      />
    );
  }

  if (!equipment) {
    return (
      <EmptyState
        title={t("equipment", "notFoundTitle")}
        message={t("equipment", "notFoundMessage")}
        icon="◎"
      />
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("equipment", "equipmentEyebrow")}</p>
          <h2 className="customers-page__title">{equipment.name}</h2>
          <div className="customers-page__meta">
            <EquipmentStatusBadge status={equipment.status} />
            <span dir="ltr">{equipment.internalNumber}</span>
            {equipment.equipmentType ? <span>{equipment.equipmentType.name}</span> : null}
          </div>
        </div>
        <div className="customers-page__actions">
          <Link to="/equipment">
            <Button variant="secondary">{t("equipment", "backToList")}</Button>
          </Link>
          {canWrite ? (
            <>
              <Link to={`/equipment/${equipment.id}/edit`}>
                <Button variant="primary">{t("common", "edit")}</Button>
              </Link>
              <Button variant="secondary" onClick={() => void handleDelete()}>
                {t("common", "delete")}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="customer-detail-grid">
        <section className="customer-detail-card">
          <h3>{t("equipment", "identitySection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("equipment", "serialNumber")}</dt>
              <dd dir="ltr">{equipment.serialNumber ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("equipment", "registrationNumber")}</dt>
              <dd dir="ltr">{equipment.registrationNumber ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("equipment", "location")}</dt>
              <dd>{equipment.location ?? emptyValue}</dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card">
          <h3>{t("equipment", "specsSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("equipment", "manufacturer")}</dt>
              <dd>{equipment.manufacturer ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("equipment", "model")}</dt>
              <dd>{equipment.model ?? emptyValue}</dd>
            </div>
            <div>
              <dt>{t("equipment", "year")}</dt>
              <dd>{equipment.year ? formatNumber(equipment.year, locale) : emptyValue}</dd>
            </div>
            <div>
              <dt>{t("equipment", "warrantyEndDate")}</dt>
              <dd>
                {equipment.warrantyEndDate
                  ? formatDate(equipment.warrantyEndDate, locale)
                  : emptyValue}
              </dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card">
          <h3>{t("equipment", "assignmentSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("equipment", "customer")}</dt>
              <dd>
                {equipment.customer ? (
                  <Link to={`/customers/${equipment.customer.id}`}>{equipment.customer.name}</Link>
                ) : (
                  emptyValue
                )}
              </dd>
            </div>
            <div>
              <dt>{t("equipment", "branch")}</dt>
              <dd>{equipment.branch?.name ?? emptyValue}</dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card">
          <h3>{t("equipment", "metricsSection")}</h3>
          <dl className="customer-detail-list">
            <div>
              <dt>{t("equipment", "engineHours")}</dt>
              <dd>
                {equipment.engineHours !== undefined
                  ? formatNumber(equipment.engineHours, locale)
                  : emptyValue}
              </dd>
            </div>
            <div>
              <dt>{t("equipment", "mileage")}</dt>
              <dd>
                {equipment.mileage !== undefined
                  ? formatNumber(equipment.mileage, locale)
                  : emptyValue}
              </dd>
            </div>
          </dl>
        </section>

        <section className="customer-detail-card customer-detail-card--wide">
          <h3>{t("equipment", "notesSection")}</h3>
          <p className="customer-detail-notes">{equipment.notes ?? t("equipment", "noNotes")}</p>
        </section>
      </div>
    </div>
  );
}
