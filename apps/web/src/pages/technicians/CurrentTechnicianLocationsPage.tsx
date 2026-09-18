import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button } from "@amarok-one/ui";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAuth } from "../../auth/useAuth";
import { formatDateTime } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getAuthErrorMessage } from "../../lib/auth-errors";
import {
  getCurrentTechnicianLocationsRequest,
  type CurrentTechnicianLocation,
} from "../../lib/attendance-api";

const AUTO_REFRESH_MS = 30_000;
const STALE_AFTER_MS = 10 * 60_000;

function mapsUrl(row: CurrentTechnicianLocation): string | null {
  if (!row.location) return null;
  return `https://www.google.com/maps?q=${row.location.latitude},${row.location.longitude}`;
}

function isStale(row: CurrentTechnicianLocation, now: number): boolean {
  if (!row.location) return false;
  return now - new Date(row.location.recordedAt).getTime() > STALE_AFTER_MS;
}

export function CurrentTechnicianLocationsPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [rows, setRows] = useState<CurrentTechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (showSpinner: boolean): Promise<void> => {
      if (!user || !accessToken) return;
      if (showSpinner) setRefreshing(true);
      setError(null);
      try {
        const result = await getCurrentTechnicianLocationsRequest(
          user.organization.id,
          accessToken,
        );
        setRows(result);
        setNow(Date.now());
      } catch (cause) {
        setError(getAuthErrorMessage(cause));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, user],
  );

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => void load(false), AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const workingCount = useMemo(() => rows.filter((row) => row.workDayId).length, [rows]);

  if (loading) return <LoadingState message={t("currentLocations", "loading")} />;
  if (error && rows.length === 0) {
    return <ErrorState message={error} onRetry={() => void load(true)} />;
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("currentLocations", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("currentLocations", "title")}</h2>
          <p className="customers-page__subtitle">{t("currentLocations", "subtitle")}</p>
        </div>
        <Button variant="primary" disabled={refreshing} onClick={() => void load(true)}>
          {refreshing ? t("currentLocations", "refreshing") : t("currentLocations", "refresh")}
        </Button>
      </header>

      <div className="customers-alert customers-alert--info" role="status">
        {t("currentLocations", "autoRefresh")} · {workingCount}/{rows.length}{" "}
        {t("currentLocations", "working")}
      </div>

      {error ? (
        <div className="customers-alert customers-alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={t("currentLocations", "emptyTitle")}
          message={t("currentLocations", "emptyMessage")}
        />
      ) : (
        <div className="customer-detail-grid">
          {rows.map((row) => {
            const active = Boolean(row.workDayId);
            const stale = isStale(row, now);
            const mapUrl = mapsUrl(row);

            return (
              <section className="customer-detail-card" key={row.userId}>
                <div className="customers-page__header">
                  <div>
                    <h3>{row.displayName}</h3>
                    <p dir="ltr">{row.email}</p>
                  </div>
                  <Badge variant={active ? "success" : "default"}>
                    {active ? t("currentLocations", "working") : t("currentLocations", "notWorking")}
                  </Badge>
                </div>

                {active ? (
                  <dl className="customer-detail-list">
                    <div>
                      <dt>{t("currentLocations", "startedAt")}</dt>
                      <dd>
                        {row.startedAt ? formatDateTime(row.startedAt) : t("common", "emptyValue")}
                      </dd>
                    </div>
                    {row.location ? (
                      <>
                        <div>
                          <dt>{t("currentLocations", "lastUpdated")}</dt>
                          <dd>
                            {formatDateTime(row.location.recordedAt)} ·{" "}
                            {stale ? t("currentLocations", "stale") : t("currentLocations", "fresh")}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("currentLocations", "source")}</dt>
                          <dd>
                            {row.location.source === "sample"
                              ? t("currentLocations", "sampled")
                              : t("currentLocations", "clockIn")}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("currentLocations", "accuracy")}</dt>
                          <dd>
                            {row.location.accuracy === null
                              ? t("common", "emptyValue")
                              : t("currentLocations", "meters", {
                                  count: Math.round(row.location.accuracy).toString(),
                                })}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt>{t("currentLocations", "lastUpdated")}</dt>
                        <dd>{t("currentLocations", "noGps")}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="customer-detail-notes">{t("currentLocations", "notWorkingHint")}</p>
                )}

                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary">{t("currentLocations", "openMap")}</Button>
                  </a>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
