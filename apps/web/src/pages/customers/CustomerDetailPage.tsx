import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CustomerDetail } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { CustomerStatusBadge } from "../../components/CustomerStatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatPhone } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  deleteCustomerRequest,
  getCustomerRequest,
  hasCustomersWrite,
} from "../../lib/customers-api";
import { isApiRequestError } from "../../lib/api-client";

type PageStatus = "loading" | "ready" | "error" | "deleting";

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canWrite = user ? hasCustomersWrite(user.permissions) : false;
  const emptyValue = t("common", "emptyValue");

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
              <dd dir="ltr">{customer.phone ? formatPhone(customer.phone, locale) : emptyValue}</dd>
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

        <section className="customer-detail-card customer-detail-card--wide">
          <h3>{t("customers", "contactsSection")}</h3>
          {customer.contacts.length === 0 ? (
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
