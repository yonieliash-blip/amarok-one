import { useEffect, useState } from "react";
import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { listDocumentCasesRequest, type DocumentCaseSummary } from "../../lib/document-cases-api";

const STATUS_LABELS: Record<string, string> = {
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

export function DocumentCasesPage() {
  const { user, accessToken } = useAuth();
  const [cases, setCases] = useState<DocumentCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canWrite = hasPermission(
    permissionSlugsFromCarrier(user),
    PERMISSIONS.DOCUMENT_CASES_WRITE,
  );

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      try {
        const result = await listDocumentCasesRequest(user.organization.id, accessToken);
        if (!cancelled) setCases(result);
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
  }, [accessToken, user]);

  if (!user || !accessToken || loading) return <LoadingState message="טוען תיקי מסמכים…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="customers-page" dir="rtl">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">ניהול משרד</p>
          <h2 className="customers-page__title">תיקי מסמכים</h2>
          <p className="customers-page__subtitle">
            דוחות עבודה, הצעות מחיר וחשבוניות לפי מספר דוח תיקון.
          </p>
        </div>
        {canWrite ? (
          <p className="customers-table__muted">פתיחת תיק חדש תתווסף לאחר אישור המיגרציה.</p>
        ) : null}
      </header>
      {cases.length === 0 ? (
        <section className="customer-form__section">
          <p className="customers-table__muted">אין עדיין תיקי מסמכים להצגה.</p>
        </section>
      ) : (
        <section className="customer-form__section">
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>מספר דוח תיקון</th>
                  <th>לקוח</th>
                  <th>מסלול</th>
                  <th>מצב</th>
                  <th>עודכן</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((documentCase) => (
                  <tr key={documentCase.id}>
                    <td>{documentCase.repairReportNumber}</td>
                    <td>{documentCase.customer.name}</td>
                    <td>
                      {documentCase.workflow === "direct_invoice"
                        ? "חשבונית ישירה"
                        : "הצעת מחיר ורכש"}
                    </td>
                    <td>{STATUS_LABELS[documentCase.status] ?? documentCase.status}</td>
                    <td>
                      {new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(
                        new Date(documentCase.updatedAt),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
