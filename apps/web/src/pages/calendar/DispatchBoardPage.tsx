import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "@amarok-one/ui";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, UsersRound } from "lucide-react";
import type { DispatchBoard, ServiceCall } from "@amarok-one/types";
import { canAssignServiceCalls, extractPermissionSlugs } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { formatDate, formatDateTime } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { assignTechnicianRequest, getDispatchBoardRequest } from "../../lib/service-calls-api";

const EMPTY_BOARD: DispatchBoard = {
  scheduledFrom: "",
  scheduledTo: "",
  technicians: [],
  assignments: [],
  unassignedServiceCalls: [],
};

function localDayRange(value: string): { scheduledFrom: string; scheduledTo: string } {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { scheduledFrom: start.toISOString(), scheduledTo: end.toISOString() };
}

function offsetDay(value: string, offset: number): string {
  const day = new Date(`${value}T00:00:00`);
  day.setDate(day.getDate() + offset);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function todayValue(): string {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function callLocation(call: ServiceCall): string | undefined {
  return call.customerSite?.name ?? call.location ?? call.customer?.name;
}

export function DispatchBoardPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(todayValue);
  const [board, setBoard] = useState<DispatchBoard>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [technicianByCall, setTechnicianByCall] = useState<Record<string, string>>({});
  const [timeByCall, setTimeByCall] = useState<Record<string, string>>({});
  const [assigningCallId, setAssigningCallId] = useState<string | null>(null);

  const canAssign = user ? canAssignServiceCalls(extractPermissionSlugs(user.permissions)) : false;

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      const range = localDayRange(selectedDate);
      try {
        const nextBoard = await getDispatchBoardRequest(
          user.organization.id,
          accessToken,
          range.scheduledFrom,
          range.scheduledTo,
        );
        if (cancelled) return;
        setBoard(nextBoard);
        setTechnicianByCall((current) => {
          const next = { ...current };
          for (const call of nextBoard.unassignedServiceCalls) {
            if (!next[call.id] && nextBoard.technicians[0]) {
              next[call.id] = nextBoard.technicians[0].id;
            }
          }
          return next;
        });
        setTimeByCall((current) => {
          const next = { ...current };
          for (const call of nextBoard.unassignedServiceCalls) {
            next[call.id] ??= "08:00";
          }
          return next;
        });
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, t("dispatch", "loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadToken, selectedDate, t, user]);

  const assignmentsByTechnician = useMemo(() => {
    const grouped = new Map<string, DispatchBoard["assignments"]>();
    for (const assignment of board.assignments) {
      const existing = grouped.get(assignment.visit.technicianId) ?? [];
      existing.push(assignment);
      grouped.set(assignment.visit.technicianId, existing);
    }
    return grouped;
  }, [board.assignments]);

  async function assign(call: ServiceCall): Promise<void> {
    if (!user || !accessToken) return;
    const technicianId = technicianByCall[call.id];
    const time = timeByCall[call.id];
    if (!technicianId || !time) return;

    const scheduledStart = new Date(`${selectedDate}T${time}:00`);
    if (Number.isNaN(scheduledStart.valueOf())) return;

    setAssigningCallId(call.id);
    setNotice(null);
    setError(null);
    try {
      await assignTechnicianRequest(user.organization.id, call.id, accessToken, {
        technicianId,
        scheduledStart: scheduledStart.toISOString(),
      });
      setNotice(t("dispatch", "assignmentSuccess"));
      setReloadToken((value) => value + 1);
    } catch (cause) {
      setError(getApiErrorMessage(cause, t("dispatch", "assignmentError")));
    } finally {
      setAssigningCallId(null);
    }
  }

  if (!user || !accessToken) return <LoadingState message={t("dispatch", "loading")} />;
  if (loading) return <LoadingState message={t("dispatch", "loading")} />;
  if (error && !board.scheduledFrom) {
    return <ErrorState message={error} onRetry={() => setReloadToken((value) => value + 1)} />;
  }

  return (
    <div className="dispatch-board">
      <header className="dispatch-board__header">
        <div>
          <p className="customers-page__eyebrow">{t("dispatch", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("dispatch", "title")}</h2>
          <p className="customers-page__subtitle">{t("dispatch", "subtitle")}</p>
        </div>
        <div className="dispatch-board__toolbar">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedDate(offsetDay(selectedDate, -1))}
          >
            <ChevronRight size={18} aria-hidden="true" />
            {t("dispatch", "previousDay")}
          </Button>
          <label className="dispatch-board__date-field">
            <span>{t("dispatch", "date")}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" onClick={() => setSelectedDate(todayValue())}>
            <CalendarDays size={18} aria-hidden="true" />
            {t("dispatch", "today")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedDate(offsetDay(selectedDate, 1))}
          >
            {t("dispatch", "nextDay")}
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setReloadToken((value) => value + 1)}
            aria-label={t("dispatch", "refresh")}
          >
            <RefreshCw size={18} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {error ? (
        <p className="dispatch-board__notice dispatch-board__notice--error">{error}</p>
      ) : null}
      {notice ? <p className="dispatch-board__notice">{notice}</p> : null}

      <section className="dispatch-board__queue" aria-labelledby="dispatch-unassigned-title">
        <div className="dispatch-board__section-heading">
          <div>
            <h3 id="dispatch-unassigned-title">{t("dispatch", "unassigned")}</h3>
            <p>{t("dispatch", "unassignedHint")}</p>
          </div>
          <strong>{board.unassignedServiceCalls.length}</strong>
        </div>
        {board.unassignedServiceCalls.length === 0 ? (
          <p className="dispatch-board__empty">{t("dispatch", "noUnassigned")}</p>
        ) : (
          <div className="dispatch-board__queue-grid">
            {board.unassignedServiceCalls.map((call) => (
              <article key={call.id} className="dispatch-call-card">
                <div className="dispatch-call-card__topline">
                  <Link to={`/service-calls/${call.id}`}>{call.serviceCallNumber}</Link>
                  <ServiceCallPriorityBadge priority={call.priority} />
                </div>
                <h4>{call.title}</h4>
                <p>{call.customer?.name ?? "—"}</p>
                {callLocation(call) ? (
                  <p className="dispatch-call-card__location">{callLocation(call)}</p>
                ) : null}
                <div className="dispatch-call-card__assignment">
                  <label>
                    <span>{t("dispatch", "technician")}</span>
                    <select
                      value={technicianByCall[call.id] ?? ""}
                      onChange={(event) =>
                        setTechnicianByCall((current) => ({
                          ...current,
                          [call.id]: event.target.value,
                        }))
                      }
                      disabled={!canAssign}
                    >
                      <option value="">{t("serviceCalls", "selectTechnician")}</option>
                      {board.technicians.map((technician) => (
                        <option key={technician.id} value={technician.id}>
                          {technician.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t("dispatch", "scheduleTime")}</span>
                    <input
                      type="time"
                      value={timeByCall[call.id] ?? "08:00"}
                      onChange={(event) =>
                        setTimeByCall((current) => ({ ...current, [call.id]: event.target.value }))
                      }
                      disabled={!canAssign}
                    />
                  </label>
                  {canAssign ? (
                    <Button
                      type="button"
                      onClick={() => void assign(call)}
                      disabled={!technicianByCall[call.id] || assigningCallId === call.id}
                    >
                      {assigningCallId === call.id
                        ? t("dispatch", "assigning")
                        : t("dispatch", "assign")}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
        {!canAssign ? (
          <p className="dispatch-board__permission">{t("dispatch", "assignmentPermissionHint")}</p>
        ) : null}
      </section>

      <section className="dispatch-board__schedule" aria-label={formatDate(selectedDate, locale)}>
        {board.technicians.length === 0 ? (
          <p className="dispatch-board__empty">{t("dispatch", "noVisits")}</p>
        ) : (
          board.technicians.map((technician) => {
            const assignments = assignmentsByTechnician.get(technician.id) ?? [];
            return (
              <Card
                key={technician.id}
                title={technician.displayName}
                className="dispatch-technician-column"
              >
                <header className="dispatch-technician-column__header">
                  <UsersRound size={20} aria-hidden="true" />
                  <p>
                    {assignments.length} {t("dispatch", "plannedVisit")}
                  </p>
                </header>
                {assignments.length === 0 ? (
                  <p className="dispatch-board__empty">{t("dispatch", "noVisits")}</p>
                ) : (
                  <div className="dispatch-technician-column__visits">
                    {assignments.map(({ visit, serviceCall }) => (
                      <Link
                        key={visit.id}
                        to={`/service-calls/${serviceCall.id}`}
                        className="dispatch-visit"
                      >
                        <div className="dispatch-visit__time">
                          {visit.scheduledStart
                            ? formatDateTime(visit.scheduledStart, locale)
                            : "—"}
                        </div>
                        <div>
                          <strong>{serviceCall.serviceCallNumber}</strong>
                          <span>{serviceCall.title}</span>
                          <small>{serviceCall.customer?.name ?? "—"}</small>
                        </div>
                        <ServiceCallLifecycleBadge lifecycleState={serviceCall.lifecycleState} />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
