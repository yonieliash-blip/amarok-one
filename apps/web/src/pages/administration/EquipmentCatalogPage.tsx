import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type {
  EquipmentCatalogModel,
  EquipmentManufacturer,
  EquipmentType,
} from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  createEquipmentCatalogModelRequest,
  createEquipmentManufacturerRequest,
  createEquipmentTypeRequest,
  listEquipmentCatalogModelsRequest,
  listEquipmentManufacturersRequest,
  listEquipmentTypesRequest,
  loadDefaultEquipmentCatalogRequest,
} from "../../lib/equipment-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "saving" | "error";

export function EquipmentCatalogPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [manufacturers, setManufacturers] = useState<EquipmentManufacturer[]>([]);
  const [models, setModels] = useState<EquipmentCatalogModel[]>([]);
  const [typeName, setTypeName] = useState("");
  const [manufacturerName, setManufacturerName] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelManufacturerId, setModelManufacturerId] = useState("");
  const [modelEquipmentTypeId, setModelEquipmentTypeId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadCatalog(): Promise<void> {
    if (!user || !accessToken) return;
    setStatus("loading");
    setErrorMessage(null);
    try {
      const [types, manufacturerRows, modelRows] = await Promise.all([
        listEquipmentTypesRequest(user.organization.id, accessToken),
        listEquipmentManufacturersRequest(user.organization.id, accessToken),
        listEquipmentCatalogModelsRequest(user.organization.id, accessToken),
      ]);
      setEquipmentTypes(types);
      setManufacturers(manufacturerRows);
      setModels(modelRows);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipmentCatalog", "loadError"))
          : t("equipmentCatalog", "loadError"),
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
    // loadCatalog intentionally reads the current authenticated session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user]);

  async function handleLoadDefaults(): Promise<void> {
    if (!user || !accessToken) return;
    setStatus("saving");
    setMessage(null);
    setErrorMessage(null);
    try {
      await loadDefaultEquipmentCatalogRequest(user.organization.id, accessToken);
      await loadCatalog();
      setMessage(t("equipmentCatalog", "defaultsLoaded"));
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipmentCatalog", "saveError"))
          : t("equipmentCatalog", "saveError"),
      );
      setStatus("ready");
    }
  }

  async function handleAddType(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken) return;
    setStatus("saving");
    try {
      const created = await createEquipmentTypeRequest(user.organization.id, accessToken, {
        name: typeName,
      });
      setEquipmentTypes((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setTypeName("");
      setMessage(t("equipmentCatalog", "typeAdded"));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipmentCatalog", "saveError"))
          : t("equipmentCatalog", "saveError"),
      );
      setStatus("ready");
    }
  }

  async function handleAddManufacturer(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken) return;
    setStatus("saving");
    try {
      const created = await createEquipmentManufacturerRequest(user.organization.id, accessToken, {
        name: manufacturerName,
      });
      setManufacturers((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setManufacturerName("");
      setMessage(t("equipmentCatalog", "manufacturerAdded"));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipmentCatalog", "saveError"))
          : t("equipmentCatalog", "saveError"),
      );
      setStatus("ready");
    }
  }

  async function handleAddModel(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken) return;
    setStatus("saving");
    try {
      const created = await createEquipmentCatalogModelRequest(user.organization.id, accessToken, {
        name: modelName,
        equipmentManufacturerId: modelManufacturerId,
        equipmentTypeId: modelEquipmentTypeId,
      });
      setModels((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setModelName("");
      setMessage(t("equipmentCatalog", "modelAdded"));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("equipmentCatalog", "saveError"))
          : t("equipmentCatalog", "saveError"),
      );
      setStatus("ready");
    }
  }

  if (!user || !accessToken || status === "loading") {
    return <LoadingState message={t("equipmentCatalog", "loading")} />;
  }

  if (status === "error") {
    return (
      <ErrorState
        message={errorMessage ?? t("equipmentCatalog", "loadError")}
        onRetry={() => void loadCatalog()}
      />
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("equipmentCatalog", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("equipmentCatalog", "title")}</h2>
          <p className="customers-page__subtitle">{t("equipmentCatalog", "subtitle")}</p>
        </div>
        <Button
          variant="secondary"
          type="button"
          disabled={status === "saving"}
          onClick={() => void handleLoadDefaults()}
        >
          {t("equipmentCatalog", "loadDefaults")}
        </Button>
      </header>

      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="customer-form">
        <section className="customer-form__section">
          <h3>{t("equipmentCatalog", "types")}</h3>
          <form className="customer-form__grid" onSubmit={(event) => void handleAddType(event)}>
            <label className="customer-form__field">
              <span>{t("equipmentCatalog", "newType")}</span>
              <input
                required
                value={typeName}
                onChange={(event) => setTypeName(event.target.value)}
              />
            </label>
            <div className="customer-form__actions">
              <Button type="submit" disabled={status === "saving"}>
                {t("equipmentCatalog", "addType")}
              </Button>
            </div>
          </form>
          <p>
            {equipmentTypes.map((item) => item.name).join(" · ") || t("equipmentCatalog", "none")}
          </p>
        </section>

        <section className="customer-form__section">
          <h3>{t("equipmentCatalog", "manufacturers")}</h3>
          <form
            className="customer-form__grid"
            onSubmit={(event) => void handleAddManufacturer(event)}
          >
            <label className="customer-form__field">
              <span>{t("equipmentCatalog", "newManufacturer")}</span>
              <input
                required
                value={manufacturerName}
                onChange={(event) => setManufacturerName(event.target.value)}
              />
            </label>
            <div className="customer-form__actions">
              <Button type="submit" disabled={status === "saving"}>
                {t("equipmentCatalog", "addManufacturer")}
              </Button>
            </div>
          </form>
          <p>
            {manufacturers.map((item) => item.name).join(" · ") || t("equipmentCatalog", "none")}
          </p>
        </section>

        <section className="customer-form__section">
          <h3>{t("equipmentCatalog", "models")}</h3>
          <form className="customer-form__grid" onSubmit={(event) => void handleAddModel(event)}>
            <label className="customer-form__field">
              <span>{t("equipmentCatalog", "newModel")}</span>
              <input
                required
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "manufacturer")}</span>
              <select
                required
                value={modelManufacturerId}
                onChange={(event) => setModelManufacturerId(event.target.value)}
              >
                <option value="" disabled>
                  —
                </option>
                {manufacturers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>{t("equipment", "equipmentType")}</span>
              <select
                required
                value={modelEquipmentTypeId}
                onChange={(event) => setModelEquipmentTypeId(event.target.value)}
              >
                <option value="" disabled>
                  —
                </option>
                {equipmentTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="customer-form__actions">
              <Button type="submit" disabled={status === "saving"}>
                {t("equipmentCatalog", "addModel")}
              </Button>
            </div>
          </form>
          <p>
            {models.length === 0
              ? t("equipmentCatalog", "none")
              : t("equipmentCatalog", "modelCount", { count: models.length })}
          </p>
        </section>
      </div>
    </div>
  );
}
