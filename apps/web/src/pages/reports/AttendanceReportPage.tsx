import { useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAuth } from "../../auth/useAuth";
import { getAuthErrorMessage } from "../../lib/auth-errors";
import {
  approveWorkDayRequest,
  correctWorkDayRequest,
  getMonthlyAttendanceReportRequest,
  lockAttendancePeriodRequest,
  unlockAttendancePeriodRequest,
  type AttendanceDay,
  type MonthlyAttendanceReport,
} from "../../lib/attendance-api";
import { formatDateTime } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { downloadAttendanceCsv } from "../../lib/attendance-csv";

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
  const [saving, setSaving] = useState(false);

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

  async function approve(day: AttendanceDay): Promise<void> {
    if (!user || !accessToken) return;
    setSaving(true);
    try {
      await approveWorkDayRequest(user.organization.id, accessToken, day.id);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function correct(day: AttendanceDay): Promise<void> {
    if (!user || !accessToken || !day.endedAt) return;
    const startedAt = window.prompt(t("attendanceReport", "startTime"), day.startedAt);
    if (!startedAt) return;
    const endedAt = window.prompt(t("attendanceReport", "endTime"), day.endedAt);
    if (!endedAt) return;
    const reason = window.prompt(t("attendanceReport", "correctionReason"));
    if (!reason || reason.trim().length < 5) return;
    setSaving(true);
    try {
      await correctWorkDayRequest(user.organization.id, accessToken, day.id, {
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        reason,
      });
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function lockPeriod(): Promise<void> {
    if (!user || !accessToken) return;
    setSaving(true);
    try {
      await lockAttendancePeriodRequest(user.organization.id, accessToken, month);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function unlockPeriod(): Promise<void> {
    if (!user || !accessToken) return;
    const reason = window.prompt(t("attendanceReport", "unlockReason"));
    if (!reason || reason.trim().length < 5) return;
    setSaving(true);
    try {
      await unlockAttendancePeriodRequest(user.organization.id, accessToken, month, reason);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

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
        {report ? (
          <>
            <strong>
              {report.locked ? t("attendanceReport", "locked") : t("attendanceReport", "open")}
            </strong>
            <button type="button" onClick={() => downloadAttendanceCsv(report)}>
              {t("attendanceReport", "exportCsv")}
            </button>
            {report.locked ? (
              <button type="button" disabled={saving} onClick={() => void unlockPeriod()}>
                {t("attendanceReport", "unlock")}
              </button>
            ) : (
              <button type="button" disabled={saving} onClick={() => void lockPeriod()}>
                {t("attendanceReport", "lock")}
              </button>
            )}
          </>
        ) : null}
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
                            .{" "}
                            {day.reviewStatus === "APPROVED"
                              ? t("attendanceReport", "approved")
                              : t("attendanceReport", "pending")}
                            {day.status === "COMPLETED" ? (
                              <span>
                                {" "}
                                <button
                                  type="button"
                                  disabled={saving || report.locked}
                                  onClick={() => void correct(day)}
                                >
                                  {t("attendanceReport", "correct")}
                                </button>
                                {day.reviewStatus !== "APPROVED" ? (
                                  <>
                                    {" "}
                                    <button
                                      type="button"
                                      disabled={saving || report.locked}
                                      onClick={() => void approve(day)}
                                    >
                                      {t("attendanceReport", "approve")}
                                    </button>
                                  </>
                                ) : null}
                              </span>
                            ) : null}
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
