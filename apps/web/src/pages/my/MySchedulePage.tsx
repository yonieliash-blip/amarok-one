import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "@amarok-one/ui";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { MySchedule } from "@amarok-one/types";
import { useAuth } from "../../auth/useAuth";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { ServiceCallLifecycleBadge } from "../../components/ServiceCallLifecycleBadge";
import { ServiceCallPriorityBadge } from "../../components/ServiceCallPriorityBadge";
import { formatDateTime } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { getMyScheduleRequest } from "../../lib/service-calls-api";

const EMPTY_SCHEDULE: MySchedule = { scheduledFrom: "", scheduledTo: "", entries: [] };

function todayValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function offsetDay(value: string, offset: number): string {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDayRange(value: string) {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { scheduledFrom: start.toISOString(), scheduledTo: end.toISOString() };
}

export function MySchedulePage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(todayValue);
  const [schedule, setSchedule] = useState<MySchedule>(EMPTY_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      const range = localDayRange(selectedDate);
      try {
        const result = await getMyScheduleRequest(
          user.organization.id,
          accessToken,
          range.scheduledFrom,
          range.scheduledTo,
        );
        if (!cancelled) setSchedule(result);
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, t("mySchedulePage", "loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey, selectedDate, t, user]);

  if (!user || !accessToken || loading)
    return <LoadingState message={t("mySchedulePage", "loading")} />;
  if (error)
    return <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />;

  return (
    <div className="dispatch-board my-schedule-page">
      <header className="dispatch-board__header">
        <div>
          <p className="customers-page__eyebrow">{t("mySchedulePage", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("mySchedulePage", "title")}</h2>
          <p className="customers-page__subtitle">{t("mySchedulePage", "subtitle")}</p>
        </div>
        <div className="dispatch-board__toolbar">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedDate(offsetDay(selectedDate, -1))}
          >
            <ChevronRight size={18} />
            {t("mySchedulePage", "previousDay")}
          </Button>
          <label className="dispatch-board__date-field">
            <span>{t("mySchedulePage", "date")}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" onClick={() => setSelectedDate(todayValue())}>
            <CalendarDays size={18} />
            {t("mySchedulePage", "today")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedDate(offsetDay(selectedDate, 1))}
          >
            {t("mySchedulePage", "nextDay")}
            <ChevronLeft size={18} />
          </Button>
        </div>
      </header>
      {schedule.entries.length === 0 ? (
        <EmptyState title={t("mySchedulePage", "empty")} message="" />
      ) : (
        <div className="my-schedule-page__entries">
          {schedule.entries.map(({ visit, serviceCall }) => (
            <Card
              key={visit.id}
              title={`${t("mySchedulePage", "visit")} · ${serviceCall.serviceCallNumber}`}
            >
              <Link className="my-schedule-page__title" to={`/service-calls/${serviceCall.id}`}>
                {serviceCall.title}
              </Link>
              <p>{serviceCall.customer?.name ?? "—"}</p>
              <p>{visit.scheduledStart ? formatDateTime(visit.scheduledStart, locale) : "—"}</p>
              <div>
                <ServiceCallPriorityBadge priority={serviceCall.priority} />
                <ServiceCallLifecycleBadge lifecycleState={serviceCall.lifecycleState} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
