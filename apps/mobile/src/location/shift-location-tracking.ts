import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { submitTrackedLocations, type TrackedLocation } from "../api/attendance";

const QUEUE_KEY = "@amarok/shift-location-queue";
const MAX_QUEUED_POINTS = 500;

async function readQueue(): Promise<TrackedLocation[]> {
  const value = await AsyncStorage.getItem(QUEUE_KEY);
  return value ? (JSON.parse(value) as TrackedLocation[]) : [];
}

async function writeQueue(points: TrackedLocation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(points.slice(-MAX_QUEUED_POINTS)));
}

export async function enqueueTrackedLocation(point: TrackedLocation): Promise<void> {
  await writeQueue([...(await readQueue()), point]);
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

export async function startForegroundShiftTracking(
  organizationId: string,
  accessToken: string,
  workDayStartedAt: string,
): Promise<Location.LocationSubscription | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;

  void flushTrackedLocations(organizationId, accessToken, workDayStartedAt).catch(() => undefined);
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 300_000, distanceInterval: 250 },
    (location) => {
      const point: TrackedLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        recordedAt: new Date(location.timestamp).toISOString(),
        ...(location.coords.accuracy === null ? {} : { accuracy: location.coords.accuracy }),
      };
      void enqueueTrackedLocation(point)
        .then(() => flushTrackedLocations(organizationId, accessToken, workDayStartedAt))
        .catch(() => undefined);
    },
  );
}
