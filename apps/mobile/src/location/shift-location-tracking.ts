import * as Location from "expo-location";
import type { TrackedLocation } from "../api/attendance";
import { enqueueTrackedLocations, flushTrackedLocations } from "./shift-location-queue";

export { flushTrackedLocations } from "./shift-location-queue";

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
      void enqueueTrackedLocations([point])
        .then(() => flushTrackedLocations(organizationId, accessToken, workDayStartedAt))
        .catch(() => undefined);
    },
  );
}
