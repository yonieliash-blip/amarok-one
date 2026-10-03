import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@amarok-one/ui";
import type {
  EmployeeInspirationMessage,
  InspirationEmployee,
  InspirationQuote,
} from "@amarok-one/types";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { UnauthorizedPage } from "../UnauthorizedPage";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { isApiRequestError } from "../../lib/api-client";
import {
  createInspirationQuoteRequest,
  listEmployeeInspirationMessagesRequest,
  listInspirationEmployeesRequest,
  listInspirationQuotesRequest,
  saveEmployeeInspirationRequest,
  updateEmployeeInspirationRequest,
  updateInspirationQuoteRequest,
} from "../../lib/inspiration-api";

type Status = "loading" | "ready" | "saving" | "error";

export function InspirationPage() {
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [quotes, setQuotes] = useState<InspirationQuote[]>([]);
  const [employees, setEmployees] = useState<InspirationEmployee[]>([]);
  const [employeeMessages, setEmployeeMessages] = useState<EmployeeInspirationMessage[]>([]);
  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canManage =
    user?.permissions.some((permission) => permission.slug === "users:write") ?? false;
  const selectedMessage = useMemo(
    () => employeeMessages.find((message) => message.memberId === selectedMemberId),
    [employeeMessages, selectedMemberId],
  );

  async function load(): Promise<void> {
    if (!user || !accessToken) return;
    setStatus("loading");
    setError(null);
    try {
      const [nextQuotes, nextEmployees, nextMessages] = await Promise.all([
        listInspirationQuotesRequest(user.organization.id, accessToken),
        listInspirationEmployeesRequest(user.organization.id, accessToken),
        listEmployeeInspirationMessagesRequest(user.organization.id, accessToken),
      ]);
      setQuotes(nextQuotes);
      setEmployees(nextEmployees);
      setEmployeeMessages(nextMessages);
      setStatus("ready");
    } catch (cause) {
      setError(
        isApiRequestError(cause)
          ? getApiErrorMessage(cause, "לא ניתן לטעון השראה")
          : "לא ניתן לטעון השראה",
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!user || !accessToken) return;
    let cancelled = false;
    const organizationId = user.organization.id;
    const token = accessToken;

    async function loadInitialData(): Promise<void> {
      try {
        const [nextQuotes, nextEmployees, nextMessages] = await Promise.all([
          listInspirationQuotesRequest(organizationId, token),
          listInspirationEmployeesRequest(organizationId, token),
          listEmployeeInspirationMessagesRequest(organizationId, token),
        ]);
        if (cancelled) return;
        setQuotes(nextQuotes);
        setEmployees(nextEmployees);
        setEmployeeMessages(nextMessages);
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(
          isApiRequestError(cause)
            ? getApiErrorMessage(cause, "לא ניתן לטעון השראה")
            : "לא ניתן לטעון השראה",
        );
        setStatus("error");
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user]);

  async function saveQuote(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken || !quoteText.trim()) return;
    setStatus("saving");
    try {
      const created = await createInspirationQuoteRequest(user.organization.id, accessToken, {
        text: quoteText.trim(),
        author: quoteAuthor.trim() || undefined,
      });
      setQuotes((current) => [created, ...current]);
      setQuoteText("");
      setQuoteAuthor("");
      setStatus("ready");
    } catch (cause) {
      setError(
        isApiRequestError(cause)
          ? getApiErrorMessage(cause, "לא ניתן לשמור את הפתגם")
          : "לא ניתן לשמור את הפתגם",
      );
      setStatus("ready");
    }
  }

  async function toggleQuote(quote: InspirationQuote): Promise<void> {
    if (!user || !accessToken) return;
    const updated = await updateInspirationQuoteRequest(
      user.organization.id,
      quote.id,
      accessToken,
      {
        isActive: !quote.isActive,
      },
    );
    setQuotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function saveEmployeeMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || !accessToken || !selectedMemberId || !messageText.trim()) return;
    setStatus("saving");
    try {
      const saved = await saveEmployeeInspirationRequest(
        user.organization.id,
        selectedMemberId,
        accessToken,
        { text: messageText.trim(), isActive: true },
      );
      setEmployeeMessages((current) => [
        saved,
        ...current.filter((message) => message.id !== saved.id),
      ]);
      setStatus("ready");
    } catch (cause) {
      setError(
        isApiRequestError(cause)
          ? getApiErrorMessage(cause, "לא ניתן לשמור את ההודעה")
          : "לא ניתן לשמור את ההודעה",
      );
      setStatus("ready");
    }
  }

  async function toggleEmployeeMessage(): Promise<void> {
    if (!user || !accessToken || !selectedMemberId || !selectedMessage) return;
    const updated = await updateEmployeeInspirationRequest(
      user.organization.id,
      selectedMemberId,
      accessToken,
      !selectedMessage.isActive,
    );
    setEmployeeMessages((current) =>
      current.map((message) => (message.id === updated.id ? updated : message)),
    );
  }

  if (!user || !accessToken) return <LoadingState message="טוען השראה…" />;
  if (!canManage) return <UnauthorizedPage />;
  if (status === "loading") return <LoadingState message="טוען השראה…" />;
  if (status === "error")
    return (
      <ErrorState
        title="לא ניתן לטעון השראה"
        message={error ?? "נסה שוב"}
        onRetry={() => void load()}
      />
    );

  return (
    <div className="inspiration-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">ניהול</p>
          <h2 className="customers-page__title">השראה</h2>
          <p className="customers-page__subtitle">
            פתגמים כלליים והודעה אישית שמוצגת לעובד במקום הפתגם הכללי.
          </p>
        </div>
      </header>

      {error ? <p className="customers-alert customers-alert--error">{error}</p> : null}

      <div className="inspiration-page__grid">
        <section className="customer-form__section">
          <h3>מאגר פתגמים</h3>
          <form className="inspiration-page__form" onSubmit={(event) => void saveQuote(event)}>
            <label className="customer-form__field">
              <span>פתגם או משפט</span>
              <textarea
                required
                rows={3}
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value)}
              />
            </label>
            <label className="customer-form__field">
              <span>מקור / מחבר (לא חובה)</span>
              <input value={quoteAuthor} onChange={(event) => setQuoteAuthor(event.target.value)} />
            </label>
            <Button variant="primary" type="submit" disabled={status === "saving"}>
              הוספת פתגם
            </Button>
          </form>
          <ul className="inspiration-page__list">
            {quotes.map((quote) => (
              <li
                key={quote.id}
                className={quote.isActive ? "" : "inspiration-page__item--inactive"}
              >
                <div>
                  <strong>{quote.text}</strong>
                  {quote.author ? <span>{quote.author}</span> : null}
                </div>
                <Button type="button" variant="secondary" onClick={() => void toggleQuote(quote)}>
                  {quote.isActive ? "השהיה" : "הפעלה"}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="customer-form__section">
          <h3>הודעה פרטנית לעובד</h3>
          <form
            className="inspiration-page__form"
            onSubmit={(event) => void saveEmployeeMessage(event)}
          >
            <label className="customer-form__field">
              <span>עובד</span>
              <select
                value={selectedMemberId}
                onChange={(event) => {
                  const memberId = event.target.value;
                  setSelectedMemberId(memberId);
                  setMessageText(
                    employeeMessages.find((message) => message.memberId === memberId)?.text ?? "",
                  );
                }}
                required
              >
                <option value="">בחירת עובד</option>
                {employees.map((employee) => (
                  <option key={employee.memberId} value={employee.memberId}>
                    {employee.displayName} — {employee.roleName}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>הודעת מוטיבציה</span>
              <textarea
                required
                rows={4}
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
              />
            </label>
            <div className="inspiration-page__actions">
              <Button
                variant="primary"
                type="submit"
                disabled={status === "saving" || !selectedMemberId}
              >
                שמירת הודעה
              </Button>
              {selectedMessage ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void toggleEmployeeMessage()}
                >
                  {selectedMessage.isActive ? "השהיית הודעה" : "הפעלת הודעה"}
                </Button>
              ) : null}
            </div>
          </form>
          <ul className="inspiration-page__list">
            {employeeMessages.map((message) => (
              <li
                key={message.id}
                className={message.isActive ? "" : "inspiration-page__item--inactive"}
              >
                <div>
                  <strong>{message.employeeName}</strong>
                  <span>{message.text}</span>
                </div>
                <small>{message.isActive ? "פעילה" : "מושהית"}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
