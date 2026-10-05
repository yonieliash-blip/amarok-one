import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { InspirationCurrent } from "@amarok-one/types";
import {
  CheckCircle2,
  ClipboardCheck,
  ChevronLeft,
  FileCheck2,
  MessageCircle,
  Plus,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@amarok-one/ui";
import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { LoadingState } from "../../components/LoadingState";
import { formatDate, formatNumber } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getCurrentInspirationRequest } from "../../lib/inspiration-api";
import { getUnreadMessageCountRequest } from "../../lib/messages-api";
import { listDocumentCasesRequest, type DocumentCaseSummary } from "../../lib/document-cases-api";
import { isClosedServiceCall, fetchAllServiceCalls } from "../../lib/service-manager-dashboard";
import { listTasksRequest } from "../../lib/tasks-api";

type PageStatus = "loading" | "ready" | "error";

interface OfficeMetric {
  id: "completedCalls" | "tasks" | "documentReview" | "documentSend" | "messages";
  titleKey: "completedCalls" | "tasks" | "managerReview" | "sendAndArchive" | "messages";
  noteKey:
    | "completedCallsNote"
    | "tasksNote"
    | "managerReviewNote"
    | "sendAndArchiveNote"
    | "messagesNote";
  icon: LucideIcon;
  value: number;
  to: string;
}

const documentCaseStatusLabels: Record<string, string> = {
  direct_invoice_draft: "טיוטת חשבונית",
  quote_draft: "טיוטת הצעת מחיר",
  quote_review_required: "ממתין לאישור הצעה",
  quote_correction_required: "הצעה לתיקון",
  quote_send_required: "הצעה לשליחה",
  waiting_purchase_order: "ממתין להזמנת רכש",
  invoice_draft: "טיוטת חשבונית",
  invoice_review_required: "ממתין לאישור חשבונית",
  invoice_correction_required: "חשבונית לתיקון",
  invoice_send_required: "חשבונית לשליחה",
  archived: "בארכיון",
};

function isOpenTask(status: string): boolean {
  return status !== "completed";
}

function documentCasesByStatus(cases: DocumentCaseSummary[], statuses: string[]): number {
  return cases.filter((entry) => statuses.includes(entry.status)).length;
}

export function OfficeDashboardPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [completedCalls, setCompletedCalls] = useState(0);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listTasksRequest>>["data"]>([]);
  const [documentCases, setDocumentCases] = useState<DocumentCaseSummary[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [inspiration, setInspiration] = useState<InspirationCurrent>({ kind: "none" });

  const permissions = permissionSlugsFromCarrier(user);
  const canReadServiceCalls = hasPermission(permissions, PERMISSIONS.SERVICE_CALLS_READ);
  const canReadDocumentCases = hasPermission(permissions, PERMISSIONS.DOCUMENT_CASES_READ);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setStatus("loading");
      try {
        const [calls, taskResponse, cases, messages, nextInspiration] = await Promise.all([
          canReadServiceCalls
            ? fetchAllServiceCalls(user.organization.id, accessToken)
            : Promise.resolve([]),
          listTasksRequest(user.organization.id, accessToken),
          canReadDocumentCases
            ? listDocumentCasesRequest(user.organization.id, accessToken)
            : Promise.resolve([]),
          getUnreadMessageCountRequest(user.organization.id, accessToken).catch(() => 0),
          getCurrentInspirationRequest(user.organization.id, accessToken).catch(
            (): InspirationCurrent => ({ kind: "none" }),
          ),
        ]);
        if (cancelled) return;
        setCompletedCalls(calls.filter(isClosedServiceCall).length);
        setTasks(taskResponse.data ?? []);
        setDocumentCases(cases);
        setUnreadMessages(messages);
        setInspiration(nextInspiration);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void load();
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, canReadDocumentCases, canReadServiceCalls, user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const displayName = user?.displayName ?? "";
    const name = displayName.trim().split(/\s+/)[0] || displayName;
    if (hour < 12) return t("managementDashboard", "greetingMorning", { name });
    if (hour < 18) return t("managementDashboard", "greetingAfternoon", { name });
    return t("managementDashboard", "greetingEvening", { name });
  }, [t, user?.displayName]);

  const metrics = useMemo<OfficeMetric[]>(
    () => [
      {
        id: "completedCalls",
        titleKey: "completedCalls",
        noteKey: "completedCallsNote",
        icon: CheckCircle2,
        value: completedCalls,
        to: "/service-calls?view=completed",
      },
      {
        id: "tasks",
        titleKey: "tasks",
        noteKey: "tasksNote",
        icon: ClipboardCheck,
        value: tasks.filter((task) => isOpenTask(task.status)).length,
        to: "/tasks",
      },
      {
        id: "documentReview",
        titleKey: "managerReview",
        noteKey: "managerReviewNote",
        icon: FileCheck2,
        value: documentCasesByStatus(documentCases, [
          "quote_review_required",
          "invoice_review_required",
          "quote_correction_required",
          "invoice_correction_required",
        ]),
        to: "/document-cases",
      },
      {
        id: "documentSend",
        titleKey: "sendAndArchive",
        noteKey: "sendAndArchiveNote",
        icon: Send,
        value: documentCasesByStatus(documentCases, [
          "quote_send_required",
          "invoice_send_required",
          "waiting_purchase_order",
        ]),
        to: "/document-cases",
      },
      {
        id: "messages",
        titleKey: "messages",
        noteKey: "messagesNote",
        icon: MessageCircle,
        value: unreadMessages,
        to: "/messages",
      },
    ],
    [completedCalls, documentCases, tasks, unreadMessages],
  );

  const recentDocumentCases = useMemo(
    () =>
      documentCases
        .filter((entry) => !entry.archivedAt)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 5),
    [documentCases],
  );
  const recentTasks = useMemo(
    () =>
      tasks
        .filter((task) => isOpenTask(task.status))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 4),
    [tasks],
  );

  if (!user || !accessToken || status === "loading") {
    return <LoadingState message={t("officeDashboard", "loading")} />;
  }

  return (
    <div className="management-dashboard office-dashboard">
      <header className="management-dashboard__header">
        <div>
          <h2 className="management-dashboard__title">{greeting}</h2>
          {inspiration.text ? (
            <p className="management-dashboard__subtitle">
              {inspiration.text}
              {inspiration.author ? ` — ${inspiration.author}` : ""}
            </p>
          ) : null}
        </div>
        <div className="management-dashboard__actions">
          <Link to="/document-cases" className="customers-page__action-link">
            <Button variant="primary" className="management-dashboard__new-call">
              <Plus size={20} aria-hidden="true" />
              {t("officeDashboard", "documentCases")}
            </Button>
          </Link>
        </div>
      </header>

      {status === "error" ? (
        <p className="management-dashboard__notice">{t("officeDashboard", "loadError")}</p>
      ) : null}

      <section
        className="management-dashboard__metrics"
        aria-label={t("officeDashboard", "workspace")}
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.id} to={metric.to} className="management-metric__link">
              <article className={`management-metric management-metric--${metric.id}`}>
                <div className="management-metric__icon">
                  <Icon size={27} aria-hidden="true" />
                </div>
                <div>
                  <p className="management-metric__label">
                    {t("officeDashboard", metric.titleKey)}
                  </p>
                  <p className="management-metric__value">{formatNumber(metric.value, locale)}</p>
                  <p className="management-metric__note">{t("officeDashboard", metric.noteKey)}</p>
                </div>
                <span className="management-metric__spark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </article>
            </Link>
          );
        })}
      </section>

      <section className="management-dashboard__grid">
        <article className="management-panel management-panel--calls">
          <header className="management-panel__header">
            <h3>{t("officeDashboard", "recentDocumentCases")}</h3>
            <Link to="/document-cases">
              {t("managementDashboard", "viewAll")} <ChevronLeft size={17} />
            </Link>
          </header>
          {recentDocumentCases.length ? (
            <div className="management-dashboard__table-wrap">
              <table className="management-dashboard__table">
                <thead>
                  <tr>
                    <th>{t("officeDashboard", "repairReport")}</th>
                    <th>{t("managementDashboard", "customer")}</th>
                    <th>{t("officeDashboard", "caseStatus")}</th>
                    <th>{t("managementDashboard", "date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocumentCases.map((documentCase) => (
                    <tr key={documentCase.id}>
                      <td>
                        <Link to="/document-cases">{documentCase.repairReportNumber}</Link>
                      </td>
                      <td>{documentCase.customer.name}</td>
                      <td>
                        {documentCaseStatusLabels[documentCase.status] ?? documentCase.status}
                      </td>
                      <td>{formatDate(documentCase.updatedAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="management-panel__empty">{t("officeDashboard", "noDocumentCases")}</p>
          )}
        </article>

        <div className="management-dashboard__aside">
          <article className="management-panel management-panel--overview">
            <header className="management-panel__header">
              <h3>{t("officeDashboard", "officeOverview")}</h3>
            </header>
            <div className="management-overview">
              <div className="management-overview__donut">
                <div className="management-overview__total">
                  <strong>
                    {formatNumber(
                      documentCases.filter((entry) => !entry.archivedAt).length,
                      locale,
                    )}
                  </strong>
                  <span>{t("officeDashboard", "activeCases")}</span>
                </div>
              </div>
              <ul className="management-overview__list">
                {metrics.map((metric) => (
                  <li key={metric.id} className={`management-overview__item--${metric.id}`}>
                    <span className="management-overview__dot" aria-hidden="true" />
                    <span>{t("officeDashboard", metric.titleKey)}</span>
                    <strong>{formatNumber(metric.value, locale)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="management-panel management-panel--parts">
            <header className="management-panel__header">
              <h3>{t("officeDashboard", "recentTasks")}</h3>
              <Link to="/tasks">
                {t("managementDashboard", "viewAll")} <ChevronLeft size={17} />
              </Link>
            </header>
            {recentTasks.length ? (
              <div className="management-dashboard__table-wrap">
                <table className="management-dashboard__table management-dashboard__table--compact">
                  <thead>
                    <tr>
                      <th>{t("officeDashboard", "task")}</th>
                      <th>{t("officeDashboard", "taskStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>{t("officeDashboard", `taskStatus_${task.status}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="management-panel__empty">{t("officeDashboard", "noTasks")}</p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
