import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { enqueueTrackedLocations } from "./shift-location-queue";
import { mapLocationObjects } from "./location-mapping";

export const BACKGROUND_SHIFT_LOCATION_TASK = "amarok-background-shift-location";

TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
  BACKGROUND_SHIFT_LOCATION_TASK,
  ({ data, error }) => {
    if (error || !data?.locations) return;
    void enqueueTrackedLocations(mapLocationObjects(data.locations)).catch(() => undefined);
  },
);

export async function isBackgroundShiftTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_SHIFT_LOCATION_TASK);
}

export async function enableBackgroundShiftTracking(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return false;

  if (!(await isBackgroundShiftTrackingActive())) {
    await Location.startLocationUpdatesAsync(BACKGROUND_SHIFT_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 300_000,
      distanceInterval: 250,
      deferredUpdatesInterval: 300_000,
      deferredUpdatesDistance: 250,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "AMAROK ONE work day",
        notificationBody: "Location recording is active during your work day.",
      },
    });
  }
  return true;
}

export async function stopBackgroundShiftTracking(): Promise<void> {
  if (await isBackgroundShiftTrackingActive()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_SHIFT_LOCATION_TASK);
  }
}
