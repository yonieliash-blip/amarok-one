import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CustomerDetail, CustomerSite, Equipment, ServiceCall } from "@amarok-one/types";
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
  createCustomerSiteRequest,
  deleteContactRequest,
  deleteCustomerRequest,
  deleteCustomerSiteRequest,
  getCustomerRequest,
  hasCustomersWrite,
  updateContactRequest,
  updateCustomerSiteRequest,
  type CustomerContactFormInput,
  type CustomerSiteFormInput,
} from "../../lib/customers-api";
import { listEquipmentRequest } from "../../lib/equipment-api";
import { listServiceCallsRequest } from "../../lib/service-calls-api";

type PageStatus = "loading" | "ready" | "error" | "deleting";
type DetailTab = "overview" | "sites" | "contacts" | "equipment" | "service-calls";
type ContactEditorMode = "closed" | "create" | { editId: string };
type SiteEditorMode = "closed" | "create" | { editId: string };

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [contactEditor, setContactEditor] = useState<ContactEditorMode>("closed");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [siteEditor, setSiteEditor] = useState<SiteEditorMode>("closed");
  const [siteForm, setSiteForm] = useState<CustomerSiteFormInput>({
    name: "",
    address: "",
    city: "",
    contactName: "",
    contactPhone: "",
    notes: "",
  });
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [selectedSiteEquipmentId, setSelectedSiteEquipmentId] = useState<string | null>(null);
  const [siteEquipment, setSiteEquipment] = useState<Equipment[]>([]);
  const [siteEquipmentLoading, setSiteEquipmentLoading] = useState(false);
  const [siteEquipmentError, setSiteEquipmentError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [serviceCallsLoading, setServiceCallsLoading] = useState(false);

  const canWrite = user ? hasCustomersWrite(user.permissions) : false;
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
    if (!user || !accessToken || !customerId || !selectedSiteEquipmentId) {
      return;
    }

    const customerSiteId = selectedSiteEquipmentId;

    let cancelled = false;

    async function loadSiteEquipment(): Promise<void> {
      setSiteEquipmentLoading(true);
      setSiteEquipmentError(null);
      try {
        const result = await listEquipmentRequest(user!.organization.id, accessToken!, {
          customerId,
          customerSiteId,
          pageSize: 100,
        });
        if (!cancelled) setSiteEquipment(result.data);
      } catch {
        if (!cancelled) {
          setSiteEquipment([]);
          setSiteEquipmentError("לא ניתן לטעון את הציוד באתר.");
        }
      } finally {
        if (!cancelled) setSiteEquipmentLoading(false);
      }
    }

    void loadSiteEquipment();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, customerId, selectedSiteEquipmentId]);

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

  function beginCreateSite(): void {
    setSiteError(null);
    setSiteForm({ name: "", address: "", city: "", contactName: "", contactPhone: "", notes: "" });
    setSiteEditor("create");
  }

  function beginEditSite(site: CustomerSite): void {
    setSiteError(null);
    setSiteForm({
      name: site.name,
      address: site.address ?? "",
      city: site.city ?? "",
      contactName: site.contactName ?? "",
      contactPhone: site.contactPhone ?? "",
      notes: site.notes ?? "",
    });
    setSiteEditor({ editId: site.id });
  }

  async function handleSiteSubmit(): Promise<void> {
    if (!user || !accessToken || !customerId || !siteForm.name.trim()) return;
    setSiteSubmitting(true);
    setSiteError(null);
    const input: CustomerSiteFormInput = {
      name: siteForm.name.trim(),
      address: siteForm.address?.trim() || undefined,
      city: siteForm.city?.trim() || undefined,
      contactName: siteForm.contactName?.trim() || undefined,
      contactPhone: siteForm.contactPhone?.trim() || undefined,
      notes: siteForm.notes?.trim() || undefined,
    };
    try {
      if (siteEditor === "create") {
        await createCustomerSiteRequest(user.organization.id, customerId, accessToken, input);
      } else if (typeof siteEditor === "object") {
        await updateCustomerSiteRequest(
          user.organization.id,
          customerId,
          siteEditor.editId,
          accessToken,
          input,
        );
      }
      setSiteEditor("closed");
      await reloadCustomer();
    } catch (error) {
      setSiteError(
        isApiRequestError(error)
          ? getApiErrorMessage(error, "לא ניתן לשמור את האתר.")
          : "לא ניתן לשמור את האתר.",
      );
    } finally {
      setSiteSubmitting(false);
    }
  }

  async function handleDeleteSite(site: CustomerSite): Promise<void> {
    if (!user || !accessToken || !customerId) return;
    if (!window.confirm(`למחוק את האתר ${site.name}? אנשי קשר שמשויכים אליו יוסרו גם הם.`)) return;
    setSiteError(null);
    try {
      await deleteCustomerSiteRequest(user.organization.id, customerId, site.id, accessToken);
      if (typeof siteEditor === "object" && siteEditor.editId === site.id) {
        setSiteEditor("closed");
      }
      if (selectedSiteEquipmentId === site.id) {
        setSelectedSiteEquipmentId(null);
        setSiteEquipment([]);
      }
      await reloadCustomer();
    } catch (error) {
      setSiteError(
        isApiRequestError(error)
          ? getApiErrorMessage(error, "לא ניתן למחוק את האתר.")
          : "לא ניתן למחוק את האתר.",
      );
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
    { id: "sites", label: "אתרים" },
    { id: "contacts", label: t("customers", "tabContacts") },
    { id: "equipment", label: t("customers", "tabEquipment") },
    { id: "service-calls", label: t("customers", "tabServiceCalls") },
  ];

  const editingContact =
    typeof contactEditor === "object"
      ? customer.contacts.find((entry) => entry.id === contactEditor.editId)
      : undefined;

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

      {activeTab === "sites" ? (
        <section className="customer-detail-card customer-detail-card--wide">
          <div className="customer-detail-card__header">
            <div>
              <h3>אתרי לקוח</h3>
              <p className="customer-detail-notes">
                האתר הוא מקום העבודה. החיוב והחשבונית נשארים על שם הלקוח הראשי.
              </p>
            </div>
            {canWrite && siteEditor === "closed" ? (
              <Button variant="primary" onClick={beginCreateSite}>
                הוספת אתר
              </Button>
            ) : null}
          </div>

          {siteError ? (
            <div className="customers-alert customers-alert--error" role="alert">
              {siteError}
            </div>
          ) : null}

          {siteEditor !== "closed" ? (
            <div className="customer-contact-form">
              <div className="customer-form__grid">
                <label className="customer-form__field">
                  <span>שם האתר {t("common", "requiredMark")}</span>
                  <input
                    required
                    value={siteForm.name}
                    onChange={(event) =>
                      setSiteForm((value) => ({ ...value, name: event.target.value }))
                    }
                  />
                </label>
                <label className="customer-form__field">
                  <span>עיר</span>
                  <input
                    value={siteForm.city ?? ""}
                    onChange={(event) =>
                      setSiteForm((value) => ({ ...value, city: event.target.value }))
                    }
                  />
                </label>
                <label className="customer-form__field customer-form__field--wide">
                  <span>כתובת לנסיעה</span>
                  <input
                    value={siteForm.address ?? ""}
                    onChange={(event) =>
                      setSiteForm((value) => ({ ...value, address: event.target.value }))
                    }
                  />
                </label>
                <label className="customer-form__field">
                  <span>איש קשר באתר</span>
                  <input
                    value={siteForm.contactName ?? ""}
                    onChange={(event) =>
                      setSiteForm((value) => ({ ...value, contactName: event.target.value }))
                    }
                  />
                </label>
                <label className="customer-form__field">
                  <span>טלפון איש קשר</span>
                  <input
                    dir="ltr"
                    type="tel"
                    value={siteForm.contactPhone ?? ""}
                    onChange={(event) =>
                      setSiteForm((value) => ({ ...value, contactPhone: event.target.value }))
                    }
                  />
                </label>
                <label className="customer-form__field customer-form__field--wide">
                  <span>{t("customers", "internalNotes")}</span>
                  <textarea
                    rows={3}
                    value={siteForm.notes ?? ""}
                    onChange={(event) =>
                      setSiteForm((value) => ({ ...value, notes: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="customer-form__actions">
                <Button
                  variant="secondary"
                  onClick={() => setSiteEditor("closed")}
                  disabled={siteSubmitting}
                >
                  {t("common", "cancel")}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleSiteSubmit()}
                  disabled={siteSubmitting}
                >
                  {siteSubmitting ? t("customers", "saving") : "שמירת אתר"}
                </Button>
              </div>
            </div>
          ) : null}

          {customer.sites.length === 0 && siteEditor === "closed" ? (
            <p className="customer-detail-notes">טרם נוספו אתרים ללקוח.</p>
          ) : null}
          {customer.sites.length > 0 ? (
            <ul className="customer-contacts-list">
              {customer.sites.map((site) => (
                <li key={site.id}>
                  <div className="customer-contacts-list__header">
                    <strong>{site.name}</strong>
                  </div>
                  {site.address ? (
                    <p>
                      {site.address}
                      {site.city ? `, ${site.city}` : ""}
                    </p>
                  ) : site.city ? (
                    <p>{site.city}</p>
                  ) : null}
                  {site.contactName ? (
                    <p>
                      איש קשר: {site.contactName}
                      {site.contactPhone ? ` · ${formatPhone(site.contactPhone, locale)}` : ""}
                    </p>
                  ) : site.contactPhone ? (
                    <p dir="ltr">{formatPhone(site.contactPhone, locale)}</p>
                  ) : null}
                  {site.notes ? <p className="customer-detail-notes">{site.notes}</p> : null}
                  {siteEditor === "closed" ? (
                    <div className="customer-contacts-list__actions">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setSelectedSiteEquipmentId((current) =>
                            current === site.id ? null : site.id,
                          )
                        }
                      >
                        {selectedSiteEquipmentId === site.id ? "סגירת ציוד באתר" : "ציוד באתר"}
                      </Button>
                      {canWrite ? (
                        <>
                          <Button variant="secondary" onClick={() => beginEditSite(site)}>
                            {t("common", "edit")}
                          </Button>
                          <Button variant="secondary" onClick={() => void handleDeleteSite(site)}>
                            {t("common", "delete")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedSiteEquipmentId === site.id ? (
                    <div className="customer-detail-card customer-detail-card--wide">
                      <h4>ציוד באתר</h4>
                      {siteEquipmentLoading ? (
                        <LoadingState message={t("equipment", "loading")} />
                      ) : null}
                      {siteEquipmentError ? (
                        <p className="customers-alert customers-alert--error">
                          {siteEquipmentError}
                        </p>
                      ) : null}
                      {!siteEquipmentLoading &&
                      !siteEquipmentError &&
                      siteEquipment.length === 0 ? (
                        <p className="customer-detail-notes">אין ציוד משויך לאתר זה.</p>
                      ) : null}
                      {!siteEquipmentLoading && siteEquipment.length > 0 ? (
                        <ul className="customer-contacts-list">
                          {siteEquipment.map((item) => (
                            <li key={item.id}>
                              <Link to={`/equipment/${item.id}`} className="customers-table__link">
                                <strong>{item.name}</strong>
                              </Link>
                              <p dir="ltr">{item.internalNumber}</p>
                              <EquipmentStatusBadge status={item.status} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
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
              sites={customer.sites}
            />
          ) : null}

          {typeof contactEditor === "object" && editingContact ? (
            <CustomerContactForm
              initialValues={{
                name: editingContact.name,
                customerSiteId: editingContact.customerSiteId,
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
              sites={customer.sites}
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
                  {contact.customerSiteId ? (
                    <p>
                      {customer.sites.find((site) => site.id === contact.customerSiteId)?.name ??
                        "אתר שהוסר"}
                    </p>
                  ) : null}
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
          <h3>{t("customers", "tabEquipment")}</h3>
          {equipmentLoading ? <LoadingState message={t("equipment", "loading")} /> : null}
          {!equipmentLoading && equipment.length === 0 ? (
            <p className="customer-detail-notes">{t("customers", "noRelatedEquipment")}</p>
          ) : null}
          {!equipmentLoading && equipment.length > 0 ? (
            <div className="customers-table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>{t("equipment", "tableName")}</th>
                    <th>{t("equipment", "tableNumber")}</th>
                    <th>{t("equipment", "tableStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/equipment/${item.id}`} className="customers-table__link">
                          <strong>{item.name}</strong>
                        </Link>
                      </td>
                      <td dir="ltr">{item.internalNumber}</td>
                      <td>
                        <EquipmentStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
