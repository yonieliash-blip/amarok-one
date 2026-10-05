import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { Button } from "@amarok-one/ui";
import { Clock3, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { formatDate } from "../i18n/format";
import { useTranslation } from "../i18n/useTranslation";
import { getApiErrorMessage } from "../lib/auth-errors";
import {
  endWorkDayRequest,
  getCurrentWorkDayRequest,
  recordWorkDayActivityRequest,
  startWorkDayRequest,
  type AttendanceLocationInput,
  type CurrentWorkDay,
} from "../lib/attendance-api";

type WorkDayControlStatus = "loading" | "ready" | "submitting" | "error";

interface WorkDayControlProps {
  onActiveChange?: (active: boolean) => void;
}

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

export function WorkDayControl({ onActiveChange }: WorkDayControlProps) {
  const { accessToken, user } = useAuth();
  const { locale, t } = useTranslation();
  const [status, setStatus] = useState<WorkDayControlStatus>("loading");
  const [workDay, setWorkDay] = useState<CurrentWorkDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastInteractionAt = useRef(0);
  const lastActivitySampleAt = useRef(0);

  const canRead = hasPermission(permissionSlugsFromCarrier(user), PERMISSIONS.MY_ATTENDANCE_READ);
  const canWrite = hasPermission(permissionSlugsFromCarrier(user), PERMISSIONS.MY_ATTENDANCE_WRITE);
  const shouldCaptureLocation = user?.role.slug === "technician";

  const load = useCallback(async (): Promise<void> => {
    if (!user || !accessToken || !canRead) return;
    setStatus("loading");
    setError(null);
    try {
      const nextWorkDay = await getCurrentWorkDayRequest(user.organization.id, accessToken);
      setWorkDay(nextWorkDay);
      onActiveChange?.(nextWorkDay?.status === "ACTIVE");
      setStatus("ready");
    } catch (cause) {
      setError(getApiErrorMessage(cause, t("workDay", "loadError")));
      setStatus("error");
    }
  }, [accessToken, canRead, onActiveChange, t, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!user || !accessToken || workDay?.status !== "ACTIVE") return;
    lastActivitySampleAt.current = 0;

    const reportActivity = () => {
      const now = Date.now();
      if (
        document.visibilityState !== "visible" ||
        now - lastInteractionAt.current > 60_000 ||
        now - lastActivitySampleAt.current < 60_000
      ) {
        return;
      }
      lastActivitySampleAt.current = now;
      void recordWorkDayActivityRequest(user.organization.id, accessToken).catch(() => {
        lastActivitySampleAt.current = 0;
      });
    };
    const onInteraction = () => {
      lastInteractionAt.current = Date.now();
      reportActivity();
    };

    onInteraction();
    window.addEventListener("pointerdown", onInteraction, { passive: true });
    window.addEventListener("keydown", onInteraction);
    window.addEventListener("touchstart", onInteraction, { passive: true });
    window.addEventListener("scroll", onInteraction, { passive: true });
    document.addEventListener("visibilitychange", onInteraction);
    const interval = window.setInterval(reportActivity, 60_000);
    return () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("touchstart", onInteraction);
      window.removeEventListener("scroll", onInteraction);
      document.removeEventListener("visibilitychange", onInteraction);
      window.clearInterval(interval);
    };
  }, [accessToken, user, workDay?.id, workDay?.status]);

  if (!user || !accessToken || !canRead || !canWrite) return null;

  const handleAction = async (): Promise<void> => {
    setStatus("submitting");
    setError(null);
    try {
      const location = shouldCaptureLocation ? await getCurrentLocation() : null;
      const nextWorkDay = workDay
        ? await endWorkDayRequest(user.organization.id, accessToken, location)
        : await startWorkDayRequest(user.organization.id, accessToken, location);
      const activeWorkDay = nextWorkDay.status === "ACTIVE" ? nextWorkDay : null;
      setWorkDay(activeWorkDay);
      onActiveChange?.(activeWorkDay !== null);
      setStatus("ready");
    } catch (cause) {
      setError(getApiErrorMessage(cause, t("workDay", "actionError")));
      setStatus("error");
    }
  };

  const isActive = workDay?.status === "ACTIVE";
  const busy = status === "loading" || status === "submitting";

  return (
    <section
      className="work-day-control work-day-control--header"
      data-allow-before-workday="true"
      aria-label={t("workDay", "title")}
    >
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
        <p className="work-day-control__hint">{t("workDay", "activityHint")}</p>
        {error ? (
          <p className="work-day-control__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        className={`work-day-control__button${isActive ? " work-day-control__button--active" : ""}`}
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
