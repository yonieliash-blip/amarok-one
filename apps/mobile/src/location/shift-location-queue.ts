import AsyncStorage from "@react-native-async-storage/async-storage";
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
