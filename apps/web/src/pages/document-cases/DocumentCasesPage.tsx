import { useEffect, useMemo, useState } from "react";
import { Button } from "@amarok-one/ui";
import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import type { Customer } from "@amarok-one/types";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listCustomersRequest } from "../../lib/customers-api";
import {
  appendDocumentVersionRequest,
  createDocumentCaseRequest,
  decideDocumentVersionRequest,
  listDocumentCaseAssigneesRequest,
  listDocumentCasesRequest,
  recordDocumentDeliveryRequest,
  submitDocumentCaseForReviewRequest,
  type DocumentCaseAssignee,
  type DocumentCaseDocument,
  type DocumentCaseSummary,
} from "../../lib/document-cases-api";

const statusLabels: Record<string, string> = {
  draft: "טיוטה",
  quote_review_required: "הצעת מחיר ממתינה לאישור",
  quote_correction_required: "הצעת מחיר הוחזרה לתיקון",
  quote_send_required: "הצעת מחיר מוכנה לשליחה",
  waiting_purchase_order: "ממתין להזמנת רכש",
  invoice_review_required: "חשבונית ממתינה לאישור",
  invoice_correction_required: "חשבונית הוחזרה לתיקון",
  invoice_send_required: "חשבונית מוכנה לשליחה",
  archived: "בארכיון",
};
const documentLabels: Record<DocumentCaseDocument["type"], string> = {
  work_report: "דוח עבודה",
  quote: "הצעת מחיר",
  purchase_order: "הזמנת רכש",
  invoice: "חשבונית",
};
function latest(row: DocumentCaseSummary, type: DocumentCaseDocument["type"]) {
  return row.documents.find((document) => document.type === type)?.versions[0];
}

export function DocumentCasesPage() {
  const { user, accessToken } = useAuth();
  const [cases, setCases] = useState<DocumentCaseSummary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignees, setAssignees] = useState<DocumentCaseAssignee[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({
    customerId: "",
    repairReportNumber: "",
    workflow: "direct_invoice" as "direct_invoice" | "quote_and_purchase_order",
    managerAssigneeId: "",
    secretaryAssigneeId: "",
  });
  const [version, setVersion] = useState({
    type: "work_report" as DocumentCaseDocument["type"],
    displayName: "",
    externalDocumentNumber: "",
  });
  const [delivery, setDelivery] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    channel: "email" as "email" | "whatsapp" | "other",
  });
  const permissions = permissionSlugsFromCarrier(user);
  const canWrite = hasPermission(permissions, PERMISSIONS.DOCUMENT_CASES_WRITE);
  const canApprove = hasPermission(permissions, PERMISSIONS.DOCUMENT_CASES_APPROVE);
  const canSend = hasPermission(permissions, PERMISSIONS.DOCUMENT_CASES_SEND);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const [nextCases, customerResult, nextAssignees] = await Promise.all([
          listDocumentCasesRequest(user.organization.id, accessToken),
          canWrite
            ? listCustomersRequest(user.organization.id, accessToken, { pageSize: 100 })
            : Promise.resolve({ data: [] as Customer[] }),
          canWrite
            ? listDocumentCaseAssigneesRequest(user.organization.id, accessToken)
            : Promise.resolve([] as DocumentCaseAssignee[]),
        ]);
        if (cancelled) return;
        setCases(nextCases);
        setCustomers(customerResult.data);
        setAssignees(nextAssignees);
        setSelectedId((current) => current || nextCases[0]?.id || "");
        setForm((current) => ({
          ...current,
          customerId: current.customerId || customerResult.data[0]?.id || "",
          managerAssigneeId: current.managerAssigneeId || nextAssignees[0]?.id || "",
          secretaryAssigneeId: current.secretaryAssigneeId || nextAssignees[0]?.id || "",
        }));
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, "לא ניתן לטעון את תיקי המסמכים."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, canWrite, reload, user]);

  const selected = useMemo(() => cases.find((row) => row.id === selectedId), [cases, selectedId]);
  const update = (result: DocumentCaseSummary) =>
    setCases((current) => current.map((row) => (row.id === result.id ? result : row)));
  async function run(action: () => Promise<DocumentCaseSummary>, message: string) {
    setSaving(true);
    setError(null);
    try {
      update(await action());
    } catch (cause) {
      setError(getApiErrorMessage(cause, message));
    } finally {
      setSaving(false);
    }
  }
  if (!user || !accessToken || loading) return <LoadingState message="טוען תיקי מסמכים…" />;
  if (error && cases.length === 0)
    return <ErrorState message={error} onRetry={() => setReload((value) => value + 1)} />;
  const reviewVersion =
    selected?.status === "quote_review_required"
      ? latest(selected, "quote")
      : selected?.status === "invoice_review_required"
        ? latest(selected, "invoice")
        : undefined;
  const deliveryVersion =
    selected?.status === "quote_send_required"
      ? latest(selected, "quote")
      : selected?.status === "invoice_send_required"
        ? latest(selected, "invoice")
        : undefined;

  return (
    <div className="customers-page" dir="rtl">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">ניהול משרד</p>
          <h2 className="customers-page__title">תיקי מסמכים</h2>
          <p className="customers-page__subtitle">
            תהליך מתועד לפי מספר דוח תיקון. בשלב זה נשמרת מטא־דאטה בלבד, ללא העלאת קבצים.
          </p>
        </div>
      </header>
      {error ? <p className="customers-table__muted">{error}</p> : null}
      {canWrite ? (
        <section className="customer-form__section">
          <h3>פתיחת תיק</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field">
              <span>לקוח</span>
              <select
                value={form.customerId}
                onChange={(event) => setForm({ ...form, customerId: event.target.value })}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>מספר דוח תיקון</span>
              <input
                value={form.repairReportNumber}
                onChange={(event) => setForm({ ...form, repairReportNumber: event.target.value })}
              />
            </label>
            <label className="customer-form__field">
              <span>מסלול</span>
              <select
                value={form.workflow}
                onChange={(event) =>
                  setForm({ ...form, workflow: event.target.value as typeof form.workflow })
                }
              >
                <option value="direct_invoice">חשבונית ישירה</option>
                <option value="quote_and_purchase_order">הצעת מחיר ורכש</option>
              </select>
            </label>
            <label className="customer-form__field">
              <span>מנהל מאשר</span>
              <select
                value={form.managerAssigneeId}
                onChange={(event) => setForm({ ...form, managerAssigneeId: event.target.value })}
              >
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>פקיד/ה אחראי/ת</span>
              <select
                value={form.secretaryAssigneeId}
                onChange={(event) => setForm({ ...form, secretaryAssigneeId: event.target.value })}
              >
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="customer-form__actions customer-form__field--wide">
              <Button
                variant="primary"
                disabled={
                  saving ||
                  !form.customerId ||
                  !form.repairReportNumber.trim() ||
                  !form.managerAssigneeId ||
                  !form.secretaryAssigneeId
                }
                onClick={() =>
                  void run(async () => {
                    const result = await createDocumentCaseRequest(
                      user.organization.id,
                      accessToken,
                      { ...form, repairReportNumber: form.repairReportNumber.trim() },
                    );
                    setForm({ ...form, repairReportNumber: "" });
                    setCases((current) => [result, ...current]);
                    setSelectedId(result.id);
                    return result;
                  }, "לא ניתן לפתוח תיק.")
                }
              >
                פתיחת תיק
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      <section className="customer-form__section">
        <h3>תיקים</h3>
        {cases.length === 0 ? (
          <p className="customers-table__muted">אין עדיין תיקי מסמכים.</p>
        ) : (
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>דוח תיקון</th>
                  <th>לקוח</th>
                  <th>מסלול</th>
                  <th>מצב</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cases.map((row) => (
                  <tr key={row.id}>
                    <td>{row.repairReportNumber}</td>
                    <td>{row.customer.name}</td>
                    <td>
                      {row.workflow === "direct_invoice" ? "חשבונית ישירה" : "הצעת מחיר ורכש"}
                    </td>
                    <td>{statusLabels[row.status] ?? row.status}</td>
                    <td>
                      <Button variant="secondary" onClick={() => setSelectedId(row.id)}>
                        פתיחה
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selected ? (
        <section className="customer-form__section">
          <h3>
            תיק {selected.repairReportNumber} — {statusLabels[selected.status]}
          </h3>
          <div className="customer-detail-grid">
            {selected.documents.map((document) => (
              <article key={document.id} className="customer-detail-card">
                <h4>{documentLabels[document.type]}</h4>
                {document.versions.map((item) => (
                  <div key={item.id}>
                    <p>
                      גרסה {item.versionNumber}: {item.displayName}
                    </p>
                    <p className="customers-table__muted">
                      {item.approval
                        ? item.approval.decision === "approved"
                          ? "אושרה"
                          : "הוחזרה לתיקון"
                        : "ללא החלטה"}
                    </p>
                    {canWrite &&
                    !item.approval &&
                    (document.type === "quote" || document.type === "invoice") ? (
                      <Button
                        variant="secondary"
                        disabled={saving}
                        onClick={() =>
                          void run(
                            () =>
                              submitDocumentCaseForReviewRequest(
                                user.organization.id,
                                accessToken,
                                selected.id,
                                item.id,
                              ),
                            "לא ניתן להעביר לאישור.",
                          )
                        }
                      >
                        העברה לאישור
                      </Button>
                    ) : null}
                  </div>
                ))}
              </article>
            ))}
          </div>
          {canWrite ? (
            <div className="customer-form__grid">
              <h4 className="customer-form__field--wide">הוספת גרסת מסמך</h4>
              <label className="customer-form__field">
                <span>סוג</span>
                <select
                  value={version.type}
                  onChange={(event) =>
                    setVersion({
                      ...version,
                      type: event.target.value as DocumentCaseDocument["type"],
                    })
                  }
                >
                  {Object.entries(documentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="customer-form__field">
                <span>שם/תיאור</span>
                <input
                  value={version.displayName}
                  onChange={(event) => setVersion({ ...version, displayName: event.target.value })}
                />
              </label>
              <label className="customer-form__field">
                <span>מספר מסמך</span>
                <input
                  value={version.externalDocumentNumber}
                  onChange={(event) =>
                    setVersion({ ...version, externalDocumentNumber: event.target.value })
                  }
                />
              </label>
              <div className="customer-form__actions customer-form__field--wide">
                <Button
                  variant="secondary"
                  disabled={saving || !version.displayName.trim()}
                  onClick={() =>
                    void run(async () => {
                      const result = await appendDocumentVersionRequest(
                        user.organization.id,
                        accessToken,
                        selected.id,
                        {
                          ...version,
                          displayName: version.displayName.trim(),
                          externalDocumentNumber:
                            version.externalDocumentNumber.trim() || undefined,
                        },
                      );
                      setVersion({ ...version, displayName: "", externalDocumentNumber: "" });
                      return result;
                    }, "לא ניתן להוסיף גרסה.")
                  }
                >
                  הוספת גרסה
                </Button>
              </div>
            </div>
          ) : null}
          {canApprove && reviewVersion ? (
            <div className="customer-form__actions">
              <Button
                variant="primary"
                disabled={saving}
                onClick={() =>
                  void run(
                    () =>
                      decideDocumentVersionRequest(
                        user.organization.id,
                        accessToken,
                        selected.id,
                        reviewVersion.id,
                        "approved",
                      ),
                    "לא ניתן לאשר.",
                  )
                }
              >
                אישור גרסה
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() =>
                  void run(
                    () =>
                      decideDocumentVersionRequest(
                        user.organization.id,
                        accessToken,
                        selected.id,
                        reviewVersion.id,
                        "returned_for_correction",
                      ),
                    "לא ניתן להחזיר לתיקון.",
                  )
                }
              >
                החזרה לתיקון
              </Button>
            </div>
          ) : null}
          {canSend && deliveryVersion ? (
            <div className="customer-form__grid">
              <h4 className="customer-form__field--wide">תיעוד שליחה</h4>
              <label className="customer-form__field">
                <span>נמען</span>
                <input
                  value={delivery.recipientName}
                  onChange={(event) =>
                    setDelivery({ ...delivery, recipientName: event.target.value })
                  }
                />
              </label>
              <label className="customer-form__field">
                <span>דוא״ל</span>
                <input
                  value={delivery.recipientEmail}
                  onChange={(event) =>
                    setDelivery({ ...delivery, recipientEmail: event.target.value })
                  }
                />
              </label>
              <label className="customer-form__field">
                <span>טלפון</span>
                <input
                  value={delivery.recipientPhone}
                  onChange={(event) =>
                    setDelivery({ ...delivery, recipientPhone: event.target.value })
                  }
                />
              </label>
              <label className="customer-form__field">
                <span>ערוץ</span>
                <select
                  value={delivery.channel}
                  onChange={(event) =>
                    setDelivery({
                      ...delivery,
                      channel: event.target.value as typeof delivery.channel,
                    })
                  }
                >
                  <option value="email">דוא״ל</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="other">אחר</option>
                </select>
              </label>
              <div className="customer-form__actions customer-form__field--wide">
                <Button
                  variant="primary"
                  disabled={
                    saving ||
                    !delivery.recipientName.trim() ||
                    (!delivery.recipientEmail.trim() && !delivery.recipientPhone.trim())
                  }
                  onClick={() =>
                    void run(async () => {
                      const result = await recordDocumentDeliveryRequest(
                        user.organization.id,
                        accessToken,
                        selected.id,
                        {
                          ...delivery,
                          recipientName: delivery.recipientName.trim(),
                          recipientEmail: delivery.recipientEmail.trim() || undefined,
                          recipientPhone: delivery.recipientPhone.trim() || undefined,
                          documentVersionIds: [deliveryVersion.id],
                        },
                      );
                      setDelivery({
                        ...delivery,
                        recipientName: "",
                        recipientEmail: "",
                        recipientPhone: "",
                      });
                      return result;
                    }, "לא ניתן לתעד שליחה.")
                  }
                >
                  תיעוד שליחה
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
