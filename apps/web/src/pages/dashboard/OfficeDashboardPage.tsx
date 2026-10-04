import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { InspirationCurrent } from "@amarok-one/types";
import {
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  MessageCircle,
  Send,
  type LucideIcon,
} from "lucide-react";
import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { LoadingState } from "../../components/LoadingState";
import { formatNumber } from "../../i18n/format";
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
  const [openTasks, setOpenTasks] = useState(0);
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
        setOpenTasks((taskResponse.data ?? []).filter((task) => isOpenTask(task.status)).length);
        setDocumentCases(cases);
        setUnreadMessages(messages);
        setInspiration(nextInspiration);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
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
        value: openTasks,
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
    [completedCalls, documentCases, openTasks, unreadMessages],
  );

  if (!user || !accessToken || status === "loading") {
    return <LoadingState message={t("officeDashboard", "loading")} />;
  }

  return (
    <div className="office-dashboard">
      <header className="office-dashboard__hero">
        <h2>{greeting}</h2>
        {inspiration.text ? (
          <p>
            {inspiration.text}
            {inspiration.author ? ` — ${inspiration.author}` : ""}
          </p>
        ) : null}
      </header>

      {status === "error" ? (
        <p className="office-dashboard__notice">{t("officeDashboard", "loadError")}</p>
      ) : null}

      <section className="office-dashboard__metrics" aria-label={t("officeDashboard", "workspace")}>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.id} to={metric.to} className="office-dashboard__metric">
              <span className="office-dashboard__metric-icon">
                <Icon size={23} aria-hidden="true" />
              </span>
              <span className="office-dashboard__metric-copy">
                <strong>{t("officeDashboard", metric.titleKey)}</strong>
                <small>{t("officeDashboard", metric.noteKey)}</small>
              </span>
              <span className="office-dashboard__metric-value">
                {formatNumber(metric.value, locale)}
              </span>
            </Link>
          );
        })}
      </section>

      <section
        className="office-dashboard__actions"
        aria-label={t("officeDashboard", "quickActions")}
      >
        <Link to="/document-cases">{t("officeDashboard", "documentCases")}</Link>
        <Link to="/tasks">{t("officeDashboard", "tasks")}</Link>
        <Link to="/messages">{t("officeDashboard", "messages")}</Link>
      </section>
    </div>
  );
}
