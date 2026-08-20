import { useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAuth } from "../../auth/useAuth";
import { getAuthErrorMessage } from "../../lib/auth-errors";
import {
  getMonthlyAttendanceReportRequest,
  type MonthlyAttendanceReport,
} from "../../lib/attendance-api";
import { formatDateTime } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";

function currentIsraelMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function hours(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function AttendanceReportPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentIsraelMonth);
  const [report, setReport] = useState<MonthlyAttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getMonthlyAttendanceReportRequest(
          user.organization.id,
          accessToken,
          month,
        );
        if (!cancelled) setReport(data);
      } catch (cause) {
        if (!cancelled) setError(getAuthErrorMessage(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, month, retryKey, user]);

  if (loading) return <LoadingState message={t("attendanceReport", "loading")} />;
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />;

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("attendanceReport", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("attendanceReport", "title")}</h2>
          <p className="customers-page__subtitle">{t("attendanceReport", "subtitle")}</p>
        </div>
        <label>
          {t("attendanceReport", "month")}
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </header>

      {!report || report.employees.length === 0 ? (
        <EmptyState
          title={t("attendanceReport", "emptyTitle")}
          message={t("attendanceReport", "emptyMessage")}
        />
      ) : (
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>{t("attendanceReport", "employee")}</th>
                <th>{t("attendanceReport", "days")}</th>
                <th>{t("attendanceReport", "gross")}</th>
                <th>{t("attendanceReport", "breaks")}</th>
                <th>{t("attendanceReport", "net")}</th>
              </tr>
            </thead>
            <tbody>
              {report.employees.map((employee) => (
                <tr key={employee.userId}>
                  <td>
                    <details>
                      <summary>
                        <strong>{employee.displayName}</strong>
                        <br />
                        <small>{employee.email}</small>
                      </summary>
                      <ul>
                        {employee.days.map((day) => (
                          <li key={day.id}>
                            {formatDateTime(day.startedAt)} —{" "}
                            {day.endedAt
                              ? formatDateTime(day.endedAt)
                              : t("attendanceReport", "active")}
                            ; {t("attendanceReport", "net")}: {hours(day.netMinutes)}; GPS:{" "}
                            {day.locationCaptured
                              ? t("attendanceReport", "yes")
                              : t("attendanceReport", "no")}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td>{employee.workDays}</td>
                  <td>{hours(employee.grossMinutes)}</td>
                  <td>{hours(employee.breakMinutes)}</td>
                  <td>
                    <strong>{hours(employee.netMinutes)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
