import AsyncStorage from "@react-native-async-storage/async-storage";
import { submitTrackedLocations, type TrackedLocation } from "../api/attendance";
import { isApiRequestError } from "../api/client";
import { refreshSessionRequest } from "../api/auth";
import {
  persistSession,
  persistShiftTrackingSession,
  readRefreshToken,
  readShiftTrackingSession,
} from "../auth/session-storage";

const QUEUE_KEY = "@amarok/shift-location-queue";
const MAX_QUEUED_POINTS = 500;

async function readQueue(): Promise<TrackedLocation[]> {
  const value = await AsyncStorage.getItem(QUEUE_KEY);
  return value ? (JSON.parse(value) as TrackedLocation[]) : [];
}

async function writeQueue(points: TrackedLocation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(points.slice(-MAX_QUEUED_POINTS)));
}

export async function enqueueTrackedLocations(points: TrackedLocation[]): Promise<void> {
  if (points.length === 0) return;
  await writeQueue([...(await readQueue()), ...points]);
}

export async function flushTrackedLocations(
  organizationId: string,
  accessToken: string,
  workDayStartedAt?: string,
): Promise<number> {
  const minimumTime = workDayStartedAt ? new Date(workDayStartedAt).getTime() : 0;
  const points = (await readQueue()).filter(
    (point) => new Date(point.recordedAt).getTime() >= minimumTime,
  );
  if (points.length === 0) return 0;
  await submitTrackedLocations(organizationId, accessToken, points);
  const submitted = new Set(
    points.map((point) => `${point.recordedAt}:${point.latitude}:${point.longitude}`),
  );
  const remaining = (await readQueue()).filter(
    (point) => !submitted.has(`${point.recordedAt}:${point.latitude}:${point.longitude}`),
  );
  await writeQueue(remaining);
  return points.length;
}

/**
 * Runs inside Expo's background location task. The session is kept in the
 * platform secure store so queued points can be delivered without requiring
 * the foreground React tree to be alive. Network or authorization failures
 * intentionally leave the queue intact for the next location callback.
 */
export async function flushBackgroundTrackedLocations(): Promise<number> {
  const tracking = await readShiftTrackingSession();
  if (!tracking) return 0;

  try {
    return await flushTrackedLocations(
      tracking.organizationId,
      tracking.accessToken,
      tracking.workDayStartedAt,
    );
  } catch (error) {
    if (!isApiRequestError(error) || (error.status !== 401 && error.status !== 403)) throw error;
  }

  const refreshToken = await readRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token for background location tracking");
  const session = await refreshSessionRequest(refreshToken);
  await persistSession(session);
  const refreshedTracking = { ...tracking, accessToken: session.accessToken };
  await persistShiftTrackingSession(refreshedTracking);
  return flushTrackedLocations(
    refreshedTracking.organizationId,
    refreshedTracking.accessToken,
    refreshedTracking.workDayStartedAt,
  );
}
