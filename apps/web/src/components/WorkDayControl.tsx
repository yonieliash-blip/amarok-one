import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { Button } from "@amarok-one/ui";
import { Clock3, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { formatDate } from "../i18n/format";
import { useTranslation } from "../i18n/useTranslation";
import { getApiErrorMessage } from "../lib/auth-errors";
import {
  endWorkDayRequest,
  getCurrentWorkDayRequest,
  startWorkDayRequest,
  type AttendanceLocationInput,
  type CurrentWorkDay,
} from "../lib/attendance-api";

type WorkDayControlStatus = "loading" | "ready" | "submitting" | "error";

function getCurrentLocation(): Promise<AttendanceLocationInput | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export function WorkDayControl() {
  const { accessToken, user } = useAuth();
  const { locale, t } = useTranslation();
  const [status, setStatus] = useState<WorkDayControlStatus>("loading");
  const [workDay, setWorkDay] = useState<CurrentWorkDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRead = hasPermission(permissionSlugsFromCarrier(user), PERMISSIONS.MY_ATTENDANCE_READ);
  const canWrite = hasPermission(permissionSlugsFromCarrier(user), PERMISSIONS.MY_ATTENDANCE_WRITE);
  const shouldCaptureLocation = user?.role.slug === "technician";

  const load = useCallback(async (): Promise<void> => {
    if (!user || !accessToken || !canRead) return;
    setStatus("loading");
    setError(null);
    try {
      setWorkDay(await getCurrentWorkDayRequest(user.organization.id, accessToken));
      setStatus("ready");
    } catch (cause) {
      setError(getApiErrorMessage(cause, t("workDay", "loadError")));
      setStatus("error");
    }
  }, [accessToken, canRead, t, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!user || !accessToken || !canRead || !canWrite) return null;

  const handleAction = async (): Promise<void> => {
    setStatus("submitting");
    setError(null);
    try {
      const location = shouldCaptureLocation ? await getCurrentLocation() : null;
      const nextWorkDay = workDay
        ? await endWorkDayRequest(user.organization.id, accessToken, location)
        : await startWorkDayRequest(user.organization.id, accessToken, location);
      setWorkDay(nextWorkDay.status === "ACTIVE" ? nextWorkDay : null);
      setStatus("ready");
    } catch (cause) {
      setError(getApiErrorMessage(cause, t("workDay", "actionError")));
      setStatus("error");
    }
  };

  const isActive = workDay?.status === "ACTIVE";
  const busy = status === "loading" || status === "submitting";

  return (
    <section className="work-day-control" aria-label={t("workDay", "title")}>
      <div className="work-day-control__icon" aria-hidden="true">
        {shouldCaptureLocation ? <MapPin size={20} /> : <Clock3 size={20} />}
      </div>
      <div className="work-day-control__content">
        <p className="work-day-control__eyebrow">{t("workDay", "title")}</p>
        <p className="work-day-control__status">
          {isActive
            ? t("workDay", "activeSince", {
                time: formatDate(workDay.startedAt, locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jerusalem",
                }),
              })
            : t("workDay", "notStarted")}
        </p>
        {shouldCaptureLocation ? (
          <p className="work-day-control__hint">{t("workDay", "locationHint")}</p>
        ) : null}
        {error ? (
          <p className="work-day-control__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant={isActive ? "secondary" : "primary"}
        disabled={busy}
        onClick={() => void handleAction()}
      >
        {status === "submitting"
          ? t("workDay", "updating")
          : isActive
            ? t("workDay", "end")
            : t("workDay", "start")}
      </Button>
    </section>
  );
}
