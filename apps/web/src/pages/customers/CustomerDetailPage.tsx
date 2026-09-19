import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CustomerDetail, Equipment, ServiceCall } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { CustomerContactForm } from "../../components/CustomerContactForm";
import { CustomerStatusBadge } from "../../components/CustomerStatusBadge";
import { EquipmentStatusBadge } from "../../components/EquipmentStatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { formatPhone } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { isApiRequestError } from "../../lib/api-client";
import {
  createContactRequest,
  deleteContactRequest,
  deleteCustomerRequest,
  getCustomerRequest,
  hasCustomersWrite,
  updateContactRequest,
  type CustomerContactFormInput,
} from "../../lib/customers-api";
import {
  deleteEquipmentRequest,
  hasEquipmentWrite,
  listEquipmentRequest,
} from "../../lib/equipment-api";
import { listServiceCallsRequest } from "../../lib/service-calls-api";

type PageStatus = "loading" | "ready" | "error" | "deleting";
type DetailTab = "overview" | "contacts" | "equipment" | "service-calls";
type ContactEditorMode = "closed" | "create" | { editId: string };

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: DetailTab =
    requestedTab === "contacts" ||
    requestedTab === "equipment" ||
    requestedTab === "service-calls"
      ? requestedTab
      : "overview";
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [contactEditor, setContactEditor] = useState<ContactEditorMode>("closed");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentActionId, setEquipmentActionId] = useState<string | null>(null);
  const [equipmentMessage, setEquipmentMessage] = useState<string | null>(null);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [serviceCallsLoading, setServiceCallsLoading] = useState(false);

  const canWrite = user ? hasCustomersWrite(user.permissions) : false;
  const canWriteEquipment = user ? hasEquipmentWrite(user.permissions) : false;
  const emptyValue = t("common", "emptyValue");

  const reloadCustomer = useCallback(async () => {
    if (!user || !accessToken || !customerId) {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const detail = await getCustomerRequest(user.organization.id, customerId, accessToken);
      setCustomer(detail);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "loadCustomerError"))
          : t("customers", "loadCustomerError"),
      );
      setStatus("error");
    }
  }, [user, accessToken, customerId, t]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken || !customerId) {
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const detail = await getCustomerRequest(user.organization.id, customerId, accessToken);
        if (!cancelled) {
          setCustomer(detail);
          setStatus("ready");
        }
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, customerId, t]);

  useEffect(() => {
    if (!user || !accessToken || !customerId || activeTab !== "equipment") {
      return;
    }

    let cancelled = false;

    async function loadEquipment(): Promise<void> {
      setEquipmentLoading(true);
      try {
        const result = await listEquipmentRequest(user!.organization.id, accessToken!, {
          customerId,
          pageSize: 50,
        });
        if (!cancelled) {
          setEquipment(result.data);
        }
      } catch {
        if (!cancelled) {
          setEquipment([]);
        }
      } finally {
        if (!cancelled) {
          setEquipmentLoading(false);
        }
      }
    }

    void loadEquipment();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, customerId, activeTab]);

  useEffect(() => {
    if (!user || !accessToken || !customerId || activeTab !== "service-calls") {
      return;
    }

    let cancelled = false;

    async function loadServiceCalls(): Promise<void> {
      setServiceCallsLoading(true);
      try {
        const result = await listServiceCallsRequest(user!.organization.id, accessToken!, {
          customerId,
          pageSize: 50,
        });
        if (!cancelled) {
          setServiceCalls(result.data);
        }
      } catch {
        if (!cancelled) {
          setServiceCalls([]);
        }
      } finally {
        if (!cancelled) {
          setServiceCallsLoading(false);
        }
      }
    }

    void loadServiceCalls();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, customerId, activeTab]);

  async function handleDelete(): Promise<void> {
    if (!user || !accessToken || !customerId || !customer) {
      return;
    }

    const confirmed = window.confirm(t("customers", "deleteConfirm", { name: customer.name }));
    if (!confirmed) {
      return;
    }

    setStatus("deleting");
    try {
      await deleteCustomerRequest(user.organization.id, customerId, accessToken);
      navigate("/customers");
    } catch (error) {
      setErrorMessage(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "deleteCustomerError"))
          : t("customers", "deleteCustomerError"),
      );
      setStatus("ready");
    }
  }

  async function handleContactSubmit(input: CustomerContactFormInput): Promise<void> {
    if (!user || !accessToken || !customerId) {
      return;
    }

    setContactSubmitting(true);
    setContactError(null);

    try {
      if (contactEditor === "create") {
        await createContactRequest(user.organization.id, customerId, accessToken, input);
      } else if (typeof contactEditor === "object") {
        await updateContactRequest(
          user.organization.id,
          customerId,
          contactEditor.editId,
          accessToken,
          input,
        );
      }
      setContactEditor("closed");
      await reloadCustomer();
    } catch (error) {
      setContactError(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "contactSaveError"))
          : t("customers", "contactSaveError"),
      );
    } finally {
      setContactSubmitting(false);
    }
  }

  async function handleDeleteContact(contactId: string, contactName: string): Promise<void> {
    if (!user || !accessToken || !customerId) {
      return;
    }

    const confirmed = window.confirm(t("customers", "deleteContactConfirm", { name: contactName }));
    if (!confirmed) {
      return;
    }

    setContactError(null);
    try {
      await deleteContactRequest(user.organization.id, customerId, contactId, accessToken);
      if (typeof contactEditor === "object" && contactEditor.editId === contactId) {
        setContactEditor("closed");
      }
      await reloadCustomer();
    } catch (error) {
      setContactError(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "contactDeleteError"))
          : t("customers", "contactDeleteError"),
      );
    }
  }

  async function handleRemoveEquipment(item: Equipment): Promise<void> {
    if (!user || !accessToken || item.status === "retired") {
      return;
    }

    const confirmed = window.confirm(
      t("customers", "removeEquipmentConfirm", { name: item.name }),
    );
    if (!confirmed) {
      return;
    }

    setEquipmentActionId(item.id);
    setEquipmentMessage(null);
    setEquipmentError(null);

    try {
      const result = await deleteEquipmentRequest(user.organization.id, item.id, accessToken);

      if (result.action === "deleted") {
        setEquipment((current) => current.filter((entry) => entry.id !== item.id));
        setEquipmentMessage(t("customers", "equipmentDeleted"));
      } else {
        setEquipment((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, status: "retired" } : entry,
          ),
        );
        setEquipmentMessage(t("customers", "equipmentRemoved"));
      }
    } catch (error) {
      setEquipmentError(
        isApiRequestError(error)
          ? getApiErrorMessage(error, t("customers", "equipmentRemoveError"))
          : t("customers", "equipmentRemoveError"),
      );
    } finally {
      setEquipmentActionId(null);
    }
  }

  if (!user || !accessToken) {
    return <LoadingState message={t("customers", "loading")} />;
  }

  if (status === "loading" || status === "deleting") {
    return (
      <LoadingState
        message={status === "deleting" ? t("customers", "deleting") : t("customers", "loading")}
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        title={t("customers", "loadErrorTitle")}
        message={errorMessage ?? t("customers", "loadCustomerError")}
        onRetry={() => void reloadCustomer()}
      />
    );
  }

  if (!customer) {
    return (
      <EmptyState
        title={t("customers", "notFoundTitle")}
        message={t("customers", "notFoundMessage")}
        icon="◎"
      />
    );
  }

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "overview", label: t("customers", "tabOverview") },
    { id: "contacts", label: t("customers", "tabContacts") },
    { id: "equipment", label: t("customers", "tabEquipment") },
    { id: "service-calls", label: t("customers", "tabServiceCalls") },
  ];

  const editingContact =
    typeof contactEditor === "object"
      ? customer.contacts.find((entry) => entry.id === contactEditor.editId)
      : undefined;
  const activeEquipment = equipment.filter((item) => item.status !== "retired");
  const removedEquipment = equipment.filter((item) => item.status === "retired");

  function renderEquipmentTable(items: Equipment[], removed = false) {
    return (
      <div className="customers-table-wrap">
        <table className="customers-table">
          <thead>
            <tr>
              <th>{t("equipment", "tableName")}</th>
              <th>{t("equipment", "tableNumber")}</th>
              <th>{t("equipment", "tableStatus")}</th>
              <th>{t("customers", "equipmentActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/equipment/${item.id}`} className="customers-table__link">
                    <strong>{item.name}</strong>
                  </Link>
                </td>
                <td dir="ltr">{item.internalNumber}</td>
                <td>
                  {removed ? (
                    <span className="customers-table__badge">
                      {t("customers", "removedFromFleet")}
                    </span>
                  ) : (
                    <EquipmentStatusBadge status={item.status} />
                  )}
                </td>
                <td>
                  {canWriteEquipment ? (
                    <div className="customers-page__actions">
                      <Link to={`/equipment/${item.id}/edit`}>
                        <Button variant="secondary">{t("common", "edit")}</Button>
                      </Link>
                      {!removed ? (
                        <Button
                          variant="secondary"
                          disabled={equipmentActionId === item.id}
                          onClick={() => void handleRemoveEquipment(item)}
                        >
                          {equipmentActionId === item.id
                            ? t("common", "loading")
                            : t("customers", "removeFromFleet")}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("customers", "customerEyebrow")}</p>
          <h2 className="customers-page__title">{customer.name}</h2>
          <div className="customers-page__meta">
            <CustomerStatusBadge status={customer.status} />
            <span dir="ltr">{customer.customerNumber}</span>
          </div>
        </div>
        <div className="customers-page__actions">
          <Link to="/customers">
            <Button variant="secondary">{t("customers", "backToList")}</Button>
          </Link>
          {canWrite ? (
            <>
              <Link to={`/customers/${customer.id}/edit`}>
                <Button variant="primary">{t("common", "edit")}</Button>
              </Link>
              <Button variant="secondary" onClick={() => void handleDelete()}>
                {t("common", "delete")}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <nav className="customer-detail-tabs" aria-label={t("customers", "detailTabsLabel")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id
                ? "customer-detail-tabs__button customer-detail-tabs__button--active"
                : "customer-detail-tabs__button"
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="customer-detail-grid">
          <section className="customer-detail-card">
            <h3>{t("customers", "profileSection")}</h3>
            <dl className="customer-detail-list">
              <div>
                <dt>{t("customers", "legalName")}</dt>
                <dd>{customer.legalName ?? emptyValue}</dd>
              </div>
              <div>
                <dt>{t("customers", "registrationNumber")}</dt>
                <dd dir="ltr">{customer.registrationNumber ?? emptyValue}</dd>
              </div>
              <div>
                <dt>{t("customers", "email")}</dt>
                <dd dir="ltr">{customer.email ?? emptyValue}</dd>
              </div>
              <div>
                <dt>{t("customers", "phone")}</dt>
                <dd dir="ltr">
                  {customer.phone ? formatPhone(customer.phone, locale) : emptyValue}
                </dd>
              </div>
            </dl>
          </section>

          <section className="customer-detail-card">
            <h3>{t("customers", "locationSection")}</h3>
            <dl className="customer-detail-list">
              <div>
                <dt>{t("customers", "address")}</dt>
                <dd>{customer.address ?? emptyValue}</dd>
              </div>
              <div>
                <dt>{t("customers", "city")}</dt>
                <dd>{customer.city ?? emptyValue}</dd>
              </div>
              <div>
                <dt>{t("customers", "country")}</dt>
                <dd>{customer.country ?? emptyValue}</dd>
              </div>
            </dl>
          </section>

          <section className="customer-detail-card customer-detail-card--wide">
            <h3>{t("customers", "notesSection")}</h3>
            <p className="customer-detail-notes">{customer.notes ?? t("customers", "noNotes")}</p>
          </section>
        </div>
      ) : null}

      {activeTab === "contacts" ? (
        <section className="customer-detail-card customer-detail-card--wide">
          <div className="customer-detail-card__header">
            <h3>{t("customers", "contactsSection")}</h3>
            {canWrite && contactEditor === "closed" ? (
              <Button variant="primary" onClick={() => setContactEditor("create")}>
                {t("customers", "addContact")}
              </Button>
            ) : null}
          </div>

          {contactError ? (
            <div className="customers-alert customers-alert--error" role="alert">
              {contactError}
            </div>
          ) : null}

          {contactEditor === "create" ? (
            <CustomerContactForm
              submitLabel={t("customers", "createContact")}
              submitting={contactSubmitting}
              onCancel={() => setContactEditor("closed")}
              onSubmit={handleContactSubmit}
            />
          ) : null}

          {typeof contactEditor === "object" && editingContact ? (
            <CustomerContactForm
              initialValues={{
                name: editingContact.name,
                email: editingContact.email,
                phone: editingContact.phone,
                jobTitle: editingContact.jobTitle,
                isPrimary: editingContact.isPrimary,
                notes: editingContact.notes,
              }}
              submitLabel={t("customers", "saveContact")}
              submitting={contactSubmitting}
              onCancel={() => setContactEditor("closed")}
              onSubmit={handleContactSubmit}
            />
          ) : null}

          {customer.contacts.length === 0 && contactEditor === "closed" ? (
            <p className="customer-detail-notes">{t("customers", "noContacts")}</p>
          ) : (
            <ul className="customer-contacts-list">
              {customer.contacts.map((contact) => (
                <li key={contact.id}>
                  <div className="customer-contacts-list__header">
                    <strong>{contact.name}</strong>
                    {contact.isPrimary ? (
                      <span className="customers-table__badge">
                        {t("customers", "primaryContact")}
                      </span>
                    ) : null}
                  </div>
                  {contact.jobTitle ? <p>{contact.jobTitle}</p> : null}
                  {contact.email ? <p dir="ltr">{contact.email}</p> : null}
                  {contact.phone ? <p dir="ltr">{formatPhone(contact.phone, locale)}</p> : null}
                  {contact.notes ? <p className="customer-detail-notes">{contact.notes}</p> : null}
                  {canWrite && contactEditor === "closed" ? (
                    <div className="customer-contacts-list__actions">
                      <Button
                        variant="secondary"
                        onClick={() => setContactEditor({ editId: contact.id })}
                      >
                        {t("common", "edit")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void handleDeleteContact(contact.id, contact.name)}
                      >
                        {t("common", "delete")}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {activeTab === "equipment" ? (
        <section className="customer-detail-card customer-detail-card--wide">
          <div className="customer-detail-card__header">
            <div>
              <h3>{t("customers", "tabEquipment")}</h3>
              <p className="customer-detail-notes">{t("customers", "fleetHint")}</p>
            </div>
            {canWriteEquipment ? (
              <Link to={`/equipment/new?customerId=${customer.id}`}>
                <Button variant="primary">{t("customers", "addEquipment")}</Button>
              </Link>
            ) : null}
          </div>

          {equipmentError ? (
            <div className="customers-alert customers-alert--error" role="alert">
              {equipmentError}
            </div>
          ) : null}
          {equipmentMessage ? (
            <div className="customers-alert customers-alert--success" role="status">
              {equipmentMessage}
            </div>
          ) : null}

          {equipmentLoading ? <LoadingState message={t("equipment", "loading")} /> : null}

          {!equipmentLoading && equipment.length === 0 ? (
            <p className="customer-detail-notes">{t("customers", "noRelatedEquipment")}</p>
          ) : null}

          {!equipmentLoading && activeEquipment.length > 0 ? (
            <>
              <h4>{t("customers", "activeFleet")}</h4>
              {renderEquipmentTable(activeEquipment)}
            </>
          ) : null}

          {!equipmentLoading && removedEquipment.length > 0 ? (
            <>
              <h4>{t("customers", "removedFleet")}</h4>
              {renderEquipmentTable(removedEquipment, true)}
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === "service-calls" ? (
        <section className="customer-detail-card customer-detail-card--wide">
          <h3>{t("customers", "tabServiceCalls")}</h3>
          {serviceCallsLoading ? <LoadingState message={t("serviceCalls", "loading")} /> : null}
          {!serviceCallsLoading && serviceCalls.length === 0 ? (
            <p className="customer-detail-notes">{t("customers", "noRelatedServiceCalls")}</p>
          ) : null}
          {!serviceCallsLoading && serviceCalls.length > 0 ? (
            <div className="customers-table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>{t("serviceCalls", "tableTitle")}</th>
                    <th>{t("serviceCalls", "tablePriority")}</th>
                    <th>{t("serviceCalls", "lifecycleColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceCalls.map((call) => (
                    <tr key={call.id}>
                      <td>
                        <Link to={`/service-calls/${call.id}`} className="customers-table__link">
                          <strong>{call.title}</strong>
                          <span className="customers-table__muted" dir="ltr">
                            {call.serviceCallNumber}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <ServiceCallPriorityBadge priority={call.priority} />
                      </td>
                      <td>
                        <ServiceCallLifecycleBadge lifecycleState={call.lifecycleState} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
